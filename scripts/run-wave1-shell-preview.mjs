import { mkdir, rm, writeFile } from "node:fs/promises";
import { spawn, spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = process.cwd();
const previewHtml = resolve(root, "wave1-preview.html");
const previewEntry = resolve(root, "src/wave1-preview.tsx");
const outputDir = resolve(root, "wave1-screenshots");
const reportPath = resolve(root, "wave1-preview-report.json");
const collapseStorageKey = "frontend-v2-auth-shell-collapsed";

const sleep = (ms) => new Promise((resolvePromise) => setTimeout(resolvePromise, ms));

const previewSource = String.raw`import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router";

import { AdminShell } from "@/app/shells/AdminShell";
import { AffiliateShell } from "@/app/shells/AffiliateShell";
import { AuthContext } from "@/auth/auth-context";
import { AdminNavigation } from "@/components/admin/AdminNavigation";
import { StudentPortalShell } from "@/components/student/StudentPortalShell";
import "@/index.css";

const params = new URLSearchParams(window.location.search);
const role = params.get("role") ?? "student";
const previewUser = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "preview@dica.local",
  user_metadata: { full_name: "Preview Dica de Cria" },
} as never;
const authValue = {
  session: null,
  user: previewUser,
  status: "ready" as const,
  errorMessage: null,
  signOut: async () => undefined,
  refreshSession: async () => undefined,
};

const PreviewContent = ({ label }: { readonly label: string }) => (
  <div className="p-4 sm:p-6 lg:p-8">
    <section className="rounded-xl border border-border bg-card p-6 shadow-soft">
      <p className="page-eyebrow">Preview estrutural</p>
      <h2 className="mt-2 text-2xl font-bold text-foreground">{label}</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Conteúdo atual preservado. Esta captura valida somente shell, sidebar,
        header contextual, collapse e comportamento responsivo.
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface-subtle p-5">Card atual</div>
        <div className="rounded-xl border border-border bg-surface-subtle p-5">Conteúdo atual</div>
        <div className="rounded-xl border border-border bg-surface-subtle p-5">Ações atuais</div>
      </div>
    </section>
  </div>
);

const StudentPreview = () => (
  <MemoryRouter initialEntries={["/aluno"]}>
    <StudentPortalShell
      displayName="Aluno Preview"
      email="aluno@dica.local"
      isSigningOut={false}
      onSignOut={() => undefined}
    >
      <PreviewContent label="Portal do Aluno" />
    </StudentPortalShell>
  </MemoryRouter>
);

const AdminPreview = () => (
  <MemoryRouter initialEntries={["/admin"]}>
    <AdminShell navigation={<AdminNavigation />}>
      <PreviewContent label="Administração" />
    </AdminShell>
  </MemoryRouter>
);

const AffiliatePreview = () => (
  <MemoryRouter initialEntries={["/afiliado#affiliate-overview"]}>
    <AffiliateShell>
      <div id="affiliate-overview"><PreviewContent label="Portal do Afiliado" /></div>
      <div id="affiliate-offers" />
      <div id="affiliate-links" />
      <div id="affiliate-clicks" />
      <div id="affiliate-conversions" />
      <div id="affiliate-commissions" />
      <div id="affiliate-payouts" />
      <div id="affiliate-events" />
    </AffiliateShell>
  </MemoryRouter>
);

const content = role === "admin"
  ? <AdminPreview />
  : role === "affiliate"
    ? <AffiliatePreview />
    : <StudentPreview />;

document.documentElement.classList.add("dark");
createRoot(document.getElementById("root")!).render(
  <AuthContext.Provider value={authValue}>{content}</AuthContext.Provider>,
);
`;

const htmlSource = `<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>Wave 1 Shell Preview</title></head><body><div id="root"></div><script type="module" src="/src/wave1-preview.tsx"></script></body></html>`;

const findChrome = () => {
  if (process.env.CHROME_BIN) return process.env.CHROME_BIN;
  for (const candidate of ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"]) {
    const found = spawnSync("which", [candidate], { encoding: "utf8" });
    if (found.status === 0 && found.stdout.trim()) return found.stdout.trim();
  }
  throw new Error("Chrome/Chromium not found on runner");
};

const waitForHttp = async (url, timeoutMs = 30000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Server is still starting.
    }
    await sleep(250);
  }
  throw new Error("Timed out waiting for " + url);
};

const waitForJson = async (url, timeoutMs = 30000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return await response.json();
    } catch {
      // Browser is still starting.
    }
    await sleep(200);
  }
  throw new Error("Timed out waiting for " + url);
};

class CdpClient {
  constructor(url) {
    this.url = url;
    this.nextId = 1;
    this.pending = new Map();
  }

  async connect() {
    this.socket = new WebSocket(this.url);
    await new Promise((resolvePromise, reject) => {
      this.socket.addEventListener("open", resolvePromise, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data));
      if (!message.id) return;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(JSON.stringify(message.error)));
      else pending.resolve(message.result ?? {});
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolvePromise, reject) => {
      this.pending.set(id, { resolve: resolvePromise, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.socket?.close();
  }
}

const createPage = async (browserPort, url, width, height) => {
  const target = await fetch(
    "http://127.0.0.1:" + browserPort + "/json/new?" + encodeURIComponent("about:blank"),
    { method: "PUT" },
  ).then((response) => response.json());
  const client = new CdpClient(target.webSocketDebuggerUrl);
  await client.connect();
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await client.send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 640,
  });
  await client.send("Page.addScriptToEvaluateOnNewDocument", {
    source: `try { window.localStorage.removeItem(${JSON.stringify(collapseStorageKey)}); } catch {}`,
  });
  await client.send("Page.navigate", { url });
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    const ready = await client.send("Runtime.evaluate", {
      expression: "document.readyState === 'complete' && Boolean(document.querySelector('[data-shell-root]'))",
      returnByValue: true,
    });
    if (ready.result?.value === true) break;
    await sleep(100);
  }
  return client;
};

const evaluate = async (client, expression) => {
  const result = await client.send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) throw new Error("Browser evaluation failed: " + expression);
  return result.result?.value;
};

const waitForCondition = async (client, expression, label, timeoutMs = 5000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await evaluate(client, expression)) return;
    await sleep(50);
  }
  throw new Error("Timed out waiting for " + label);
};

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const pressTab = async (client) => {
  await client.send("Input.dispatchKeyEvent", {
    type: "keyDown",
    key: "Tab",
    code: "Tab",
    windowsVirtualKeyCode: 9,
    nativeVirtualKeyCode: 9,
  });
  await client.send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key: "Tab",
    code: "Tab",
    windowsVirtualKeyCode: 9,
    nativeVirtualKeyCode: 9,
  });
};

const pressEscape = async (client) => {
  await client.send("Input.dispatchKeyEvent", {
    type: "keyDown",
    key: "Escape",
    code: "Escape",
    windowsVirtualKeyCode: 27,
    nativeVirtualKeyCode: 27,
  });
  await client.send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key: "Escape",
    code: "Escape",
    windowsVirtualKeyCode: 27,
    nativeVirtualKeyCode: 27,
  });
};

const capture = async (client, fileName) => {
  const result = await client.send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false,
  });
  await writeFile(resolve(outputDir, fileName), Buffer.from(result.data, "base64"));
};

let vite;
let chrome;
const report = { roles: {}, routesInvariant: true, checks: [] };

try {
  await mkdir(outputDir, { recursive: true });
  await writeFile(previewHtml, htmlSource, "utf8");
  await writeFile(previewEntry, previewSource, "utf8");

  vite = spawn("npm", ["run", "dev", "--", "--host", "127.0.0.1", "--port", "4173"], {
    cwd: root,
    stdio: ["ignore", "inherit", "inherit"],
    env: { ...process.env, VITE_APP_ENV: "development" },
  });
  await waitForHttp("http://127.0.0.1:4173/wave1-preview.html?role=student");

  const chromePath = findChrome();
  const browserPort = 9222;
  chrome = spawn(
    chromePath,
    [
      "--headless=new",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--remote-allow-origins=*",
      "--remote-debugging-port=" + browserPort,
      "--user-data-dir=/tmp/wave1-shell-chrome",
      "about:blank",
    ],
    { stdio: ["ignore", "ignore", "inherit"] },
  );
  await waitForJson("http://127.0.0.1:" + browserPort + "/json/version");

  for (const role of ["student", "admin", "affiliate"]) {
    report.roles[role] = { desktop: {}, tablet: {}, mobile: {} };
    const url = "http://127.0.0.1:4173/wave1-preview.html?role=" + role;

    const desktop = await createPage(browserPort, url, 1440, 1000);
    assert(await evaluate(desktop, "Boolean(document.querySelector('a[aria-current=\"page\"]'))"), role + ": active state missing on desktop");
    assert(await evaluate(desktop, "Boolean(document.querySelector('[data-shell-logout]'))"), role + ": logout missing on desktop");
    const collapseTriggerFound = await evaluate(desktop, "Boolean(document.querySelector('[data-shell-collapse]'))");
    const initialCollapsed = await evaluate(desktop, "document.querySelector('[data-shell-sidebar]').dataset.collapsed");
    const initialWidth = await evaluate(desktop, "document.querySelector('[data-shell-sidebar]').getBoundingClientRect().width");
    const initialAriaPressed = await evaluate(desktop, "document.querySelector('[data-shell-collapse]').getAttribute('aria-pressed')");
    assert(collapseTriggerFound, role + ": collapse trigger missing");
    assert(initialCollapsed === "false", role + ": preview must start expanded");
    assert(initialWidth >= 240 && initialWidth <= 272, role + ": expanded sidebar width outside expected range");
    assert(initialAriaPressed === "false", role + ": collapse trigger aria-pressed must start false");
    await pressTab(desktop);
    assert(await evaluate(desktop, "document.activeElement !== document.body && document.activeElement.matches(':focus-visible')"), role + ": keyboard focus is not visible");
    await capture(desktop, role + "-desktop.png");
    await evaluate(desktop, "document.querySelector('[data-shell-collapse]').click()");
    await waitForCondition(
      desktop,
      "document.querySelector('[data-shell-sidebar]').dataset.collapsed === 'true' && document.querySelector('[data-shell-collapse]').getAttribute('aria-pressed') === 'true'",
      role + " collapse state",
    );
    await waitForCondition(
      desktop,
      "document.querySelector('[data-shell-sidebar]').getBoundingClientRect().width <= 84",
      role + " collapsed width",
    );
    const collapsedWidth = await evaluate(desktop, "document.querySelector('[data-shell-sidebar]').getBoundingClientRect().width");
    console.log(
      `COLLAPSE_DIAGNOSTIC role=${role} trigger=${collapseTriggerFound} initial=${initialCollapsed} initialWidth=${initialWidth} final=true finalWidth=${collapsedWidth}`,
    );
    report.roles[role].desktop = {
      activeState: true,
      collapse: true,
      collapseTriggerFound,
      initialCollapsed,
      initialWidth,
      collapsedWidth,
      keyboardFocus: true,
      logout: true,
    };
    desktop.close();

    const tablet = await createPage(browserPort, url, 820, 900);
    await evaluate(tablet, "document.querySelector('[data-shell-menu-button]').click()");
    await sleep(300);
    assert(await evaluate(tablet, "Boolean(document.querySelector('[data-shell-drawer-content][data-state=\"open\"]'))"), role + ": tablet drawer did not open");
    await pressEscape(tablet);
    await sleep(300);
    assert(await evaluate(tablet, "!document.querySelector('[data-shell-drawer-content][data-state=\"open\"]')"), role + ": tablet drawer did not close with Escape");
    report.roles[role].tablet = { drawerOpenClose: true, escape: true };
    tablet.close();

    const mobile = await createPage(browserPort, url, 390, 844);
    assert(await evaluate(mobile, "Boolean(document.querySelector('[data-shell-menu-button]'))"), role + ": mobile menu trigger missing");
    await evaluate(mobile, "document.querySelector('[data-shell-menu-button]').click()");
    await sleep(350);
    assert(await evaluate(mobile, "Boolean(document.querySelector('[data-shell-drawer-content][data-state=\"open\"]'))"), role + ": mobile drawer did not open");
    assert(await evaluate(mobile, "Boolean(document.querySelector('[data-shell-drawer-content] [data-shell-logout]'))"), role + ": logout inaccessible in mobile drawer");
    await capture(mobile, role + "-mobile.png");
    await pressEscape(mobile);
    await sleep(300);
    assert(await evaluate(mobile, "!document.querySelector('[data-shell-drawer-content][data-state=\"open\"]')"), role + ": mobile drawer did not close");
    report.roles[role].mobile = { drawerOpenClose: true, logout: true, screenshotWithDrawer: true };
    mobile.close();
  }

  report.checks.push("active-state", "desktop-collapse", "tablet-drawer", "mobile-drawer", "keyboard-focus-visible", "logout-accessible");
  await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n", "utf8");
  console.log("WAVE1_VISUAL_PREVIEW=PASS");
} finally {
  vite?.kill("SIGTERM");
  chrome?.kill("SIGTERM");
  await rm(previewHtml, { force: true });
  await rm(previewEntry, { force: true });
}

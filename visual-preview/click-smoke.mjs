import { spawn, spawnSync } from "node:child_process";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const base = process.env.PREVIEW_BASE_URL ?? "http://127.0.0.1:4173/aprendendo-com-dj-stay/";

const findChrome = () => {
  if (process.env.CHROME_BIN) return process.env.CHROME_BIN;
  for (const candidate of ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"]) {
    const found = spawnSync("which", [candidate], { encoding: "utf8" });
    if (found.status === 0 && found.stdout.trim()) return found.stdout.trim();
  }
  throw new Error("Chrome/Chromium não encontrado.");
};

const waitJson = async (url, timeoutMs = 30000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
    } catch {}
    await sleep(150);
  }
  throw new Error(`Timeout: ${url}`);
};

class Cdp {
  constructor(url) { this.url = url; this.id = 1; this.pending = new Map(); }
  async connect() {
    this.ws = new WebSocket(this.url);
    await new Promise((resolve, reject) => {
      this.ws.addEventListener("open", resolve, { once: true });
      this.ws.addEventListener("error", reject, { once: true });
    });
    this.ws.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data));
      if (!message.id) return;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      message.error ? pending.reject(new Error(JSON.stringify(message.error))) : pending.resolve(message.result ?? {});
    });
  }
  send(method, params = {}) {
    const id = this.id++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.ws?.close(); }
}

const evaluate = async (client, expression) => {
  const result = await client.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(`Eval failed: ${expression}`);
  return result.result?.value;
};

const waitFor = async (client, expression, timeoutMs = 15000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      if (await evaluate(client, expression)) return true;
    } catch {}
    await sleep(100);
  }
  return false;
};

const expectedPath = (slug) => `/visual-preview/${slug}/`;
const currentSlugExpression = `document.body.dataset.previewSurface || ''`;

const waitSurface = async (client, slug) => {
  const ready = await waitFor(client, `document.documentElement.dataset.visualPreviewReady === 'true' && ${currentSlugExpression} === ${JSON.stringify(slug)}`);
  if (!ready) throw new Error(`Destino não ficou pronto: ${slug}`);
  const href = await evaluate(client, "location.pathname");
  if (!href.endsWith(expectedPath(slug))) throw new Error(`URL inesperada para ${slug}: ${href}`);
};

const clickDestination = async (client, slug, { navigator = false } = {}) => {
  const selector = navigator
    ? `[data-preview-navigator] a[href$="/visual-preview/${slug}/"]`
    : `[data-preview-destination="${slug}"]:not([data-preview-navigator] *)`;
  if (navigator) {
    await evaluate(client, `document.querySelector('[data-preview-navigator] > button')?.click()`);
    await sleep(50);
  }
  const found = await waitFor(client, `Boolean(document.querySelector(${JSON.stringify(selector)}))`, 5000);
  if (!found) {
    const available = await evaluate(client, `Array.from(document.querySelectorAll('[data-preview-destination]')).map((el) => ({text:(el.textContent||'').trim().slice(0,80),dest:el.dataset.previewDestination})).slice(0,80)`);
    throw new Error(`Ação real não encontrada para ${slug}. Disponíveis: ${JSON.stringify(available)}`);
  }
  await evaluate(client, `document.querySelector(${JSON.stringify(selector)}).click()`);
  await waitSurface(client, slug);
  console.log(`CLICK_NAV ${slug} PASS`);
};

const browserBackForward = async (client, backSlug, forwardSlug) => {
  await client.send("Page.goBack");
  await waitSurface(client, backSlug);
  await client.send("Page.goForward");
  await waitSurface(client, forwardSlug);
  console.log(`BROWSER_BACK_FORWARD ${backSlug} -> ${forwardSlug} PASS`);
};

const runScenario = async (client, viewport) => {
  await client.send("Emulation.setDeviceMetricsOverride", { width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: viewport.width < 640 });
  await client.send("Page.navigate", { url: `${base}visual-preview/public/home/` });
  await waitSurface(client, "public/home");

  await clickDestination(client, "public/login");
  await clickDestination(client, "student/dashboard");
  await browserBackForward(client, "public/login", "student/dashboard");

  await clickDestination(client, "student/courses");
  await clickDestination(client, "student/course");
  await clickDestination(client, "student/lesson-video");

  await clickDestination(client, "admin/dashboard", { navigator: true });
  await clickDestination(client, "admin/courses");
  await clickDestination(client, "admin/course-new");
  await clickDestination(client, "admin/dashboard", { navigator: true });
  await clickDestination(client, "admin/products");

  await clickDestination(client, "affiliate/active", { navigator: true });
  await clickDestination(client, "affiliate/offers");
  await clickDestination(client, "affiliate/links");
  await clickDestination(client, "affiliate/commissions");

  await clickDestination(client, "commerce/courses", { navigator: true });
  await clickDestination(client, "commerce/checkout-processing");
  await clickDestination(client, "commerce/payment-success", { navigator: true });

  console.log(`CLICK_SCENARIO_${viewport.name.toUpperCase()}=PASS`);
};

const chromePath = findChrome();
const port = 9444;
const chrome = spawn(chromePath, [
  "--headless=new", "--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu",
  "--remote-allow-origins=*", `--remote-debugging-port=${port}`,
  "--user-data-dir=/tmp/visual-preview-click-chrome", "about:blank",
], { stdio: ["ignore", "ignore", "ignore"] });

try {
  await waitJson(`http://127.0.0.1:${port}/json/version`);
  const target = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" }).then((response) => response.json());
  const client = new Cdp(target.webSocketDebuggerUrl);
  await client.connect();
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  for (const viewport of [{ name: "desktop", width: 1440, height: 1000 }, { name: "mobile", width: 390, height: 844 }]) {
    await runScenario(client, viewport);
  }
  const navigableCount = await evaluate(client, "document.querySelectorAll('[data-preview-destination]').length");
  console.log(`CLICK_NAVIGABLE_ACTIONS_LAST_SURFACE=${navigableCount}`);
  console.log("PREVIEW_CLICK_SMOKE=PASS");
  client.close();
  await fetch(`http://127.0.0.1:${port}/json/close/${target.id}`);
} finally {
  chrome.kill("SIGTERM");
}

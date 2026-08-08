import { mkdir, writeFile } from "node:fs/promises";
import { spawn, spawnSync } from "node:child_process";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const base = process.env.PREVIEW_BASE_URL ?? "http://127.0.0.1:4173/aprendendo-com-dj-stay/";
const diagnosticsDir = process.env.CLICK_SMOKE_DIAGNOSTICS_DIR ?? "click-smoke-artifacts";
let currentStep = { scenario: "bootstrap", viewport: "unknown", from: "", action: "", selector: "", expectedSlug: "" };
let client;
const consoleErrors = [];

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
      if (message.method === "Runtime.consoleAPICalled" && message.params?.type === "error") {
        consoleErrors.push(message.params.args?.map((arg) => arg.value ?? arg.description ?? "").join(" ") ?? "console.error");
      }
      if (message.method === "Runtime.exceptionThrown") {
        consoleErrors.push(message.params?.exceptionDetails?.text ?? "Runtime.exceptionThrown");
      }
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

const evaluate = async (cdp, expression) => {
  const result = await cdp.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(`Eval failed: ${expression}`);
  return result.result?.value;
};

const waitFor = async (cdp, expression, timeoutMs = 15000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try { if (await evaluate(cdp, expression)) return true; } catch {}
    await sleep(100);
  }
  return false;
};

const expectedPath = (slug) => `/visual-preview/${slug}/`;
const currentSlugExpression = `document.body.dataset.previewSurface || ''`;
const surfaceMarker = async (cdp) => evaluate(cdp, `({slug:document.body.dataset.previewSurface||'', title:document.title, h1:document.querySelector('h1')?.textContent?.trim()||'', body:(document.body.innerText||'').slice(0,1200)})`);

const waitSurface = async (cdp, slug) => {
  const ready = await waitFor(cdp, `document.documentElement.dataset.visualPreviewReady === 'true' && ${currentSlugExpression} === ${JSON.stringify(slug)}`);
  if (!ready) throw new Error(`Destino não ficou pronto: ${slug}`);
  const href = await evaluate(cdp, "location.pathname");
  if (!href.endsWith(expectedPath(slug))) throw new Error(`URL inesperada para ${slug}: ${href}`);
};

const selectorForDestination = (slug, navigator) => navigator
  ? `[data-preview-navigator] a[href$="/visual-preview/${slug}/"]`
  : `[data-preview-destination="${slug}"]:not([data-preview-navigator] *)`;
const isVisibleExpression = (selector) => `(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return false; const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden'; })()`;

const openResponsiveNavigationIfNeeded = async (cdp, selector) => {
  if (await evaluate(cdp, isVisibleExpression(selector))) return;
  if (await evaluate(cdp, `Boolean(document.querySelector('[data-shell-menu-button]'))`)) {
    await evaluate(cdp, `document.querySelector('[data-shell-menu-button]').click()`);
    await waitFor(cdp, isVisibleExpression(selector), 3000);
    return;
  }
  const publicMenuSelector = `button[aria-label*="menu" i], button[aria-label*="navegação" i], button[aria-label*="navegacao" i], header button`;
  if (await evaluate(cdp, `Boolean(document.querySelector(${JSON.stringify(publicMenuSelector)}))`)) {
    await evaluate(cdp, `document.querySelector(${JSON.stringify(publicMenuSelector)}).click()`);
    await waitFor(cdp, isVisibleExpression(selector), 3000);
  }
};

const logStep = async (cdp, result, extra = {}) => {
  const url = await evaluate(cdp, "location.href").catch(() => "unavailable");
  const marker = await surfaceMarker(cdp).catch(() => ({}));
  console.log(JSON.stringify({
    SCENARIO: currentStep.scenario,
    VIEWPORT: currentStep.viewport,
    FROM: currentStep.from,
    ACTION: currentStep.action,
    SELECTOR_OR_ACCESSIBLE_NAME: currentStep.selector,
    URL_AFTER: url,
    EXPECTED_URL: currentStep.expectedSlug ? expectedPath(currentStep.expectedSlug) : "",
    EXPECTED_SURFACE: currentStep.expectedSlug,
    OBSERVED_SURFACE: marker.slug,
    OBSERVED_TITLE: marker.title,
    OBSERVED_H1: marker.h1,
    RESULT: result,
    ...extra,
  }));
};

const clickDestination = async (cdp, slug, { navigator = false, scenario = "navigation", action = slug } = {}) => {
  const selector = selectorForDestination(slug, navigator);
  const before = await evaluate(cdp, "location.href");
  currentStep = { scenario, viewport: currentStep.viewport, from: await evaluate(cdp, currentSlugExpression), action, selector, expectedSlug: slug };
  console.log(JSON.stringify({ SCENARIO: scenario, VIEWPORT: currentStep.viewport, FROM: currentStep.from, ACTION: action, SELECTOR_OR_ACCESSIBLE_NAME: selector, URL_BEFORE: before, EXPECTED_URL: expectedPath(slug), EXPECTED_SURFACE: slug, RESULT: "START" }));
  if (navigator) {
    await evaluate(cdp, `document.querySelector('[data-preview-navigator] > button')?.click()`);
    await sleep(50);
  }
  let found = await waitFor(cdp, `Boolean(document.querySelector(${JSON.stringify(selector)}))`, 5000);
  if (!found) {
    const available = await evaluate(cdp, `Array.from(document.querySelectorAll('a,button,[role="button"]')).map((el) => { const r=el.getBoundingClientRect(); const s=getComputedStyle(el); return {tag:el.tagName,text:(el.textContent||'').trim().replace(/\\s+/g,' ').slice(0,120),aria:el.getAttribute('aria-label'),href:el.getAttribute('href'),dest:el.dataset.previewDestination||null,visible:r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'}; }).filter(x=>x.visible).slice(0,160)`);
    throw new Error(`Ação real não encontrada para ${slug}. Visíveis: ${JSON.stringify(available)}`);
  }
  if (!navigator) await openResponsiveNavigationIfNeeded(cdp, selector);
  found = await evaluate(cdp, isVisibleExpression(selector));
  if (!found) throw new Error(`Ação para ${slug} existe, mas não ficou visível para clique real.`);
  await evaluate(cdp, `document.querySelector(${JSON.stringify(selector)}).click()`);
  await waitSurface(cdp, slug);
  await logStep(cdp, "PASS");
};

const browserBackForward = async (cdp, backSlug, forwardSlug, scenario) => {
  currentStep = { scenario, viewport: currentStep.viewport, from: await evaluate(cdp, currentSlugExpression), action: "browser back/forward", selector: "CDP Page.navigateToHistoryEntry", expectedSlug: backSlug };
  const beforeBack = await cdp.send("Page.getNavigationHistory");
  const backEntry = beforeBack.entries[beforeBack.currentIndex - 1];
  if (!backEntry) throw new Error("Histórico não possui entrada anterior.");
  await cdp.send("Page.navigateToHistoryEntry", { entryId: backEntry.id });
  await waitSurface(cdp, backSlug);
  const afterBack = await cdp.send("Page.getNavigationHistory");
  const forwardEntry = afterBack.entries[afterBack.currentIndex + 1];
  if (!forwardEntry) throw new Error("Histórico não possui entrada seguinte.");
  await cdp.send("Page.navigateToHistoryEntry", { entryId: forwardEntry.id });
  await waitSurface(cdp, forwardSlug);
  currentStep.expectedSlug = forwardSlug;
  await logStep(cdp, "PASS", { HISTORY_BACK: backSlug, HISTORY_FORWARD: forwardSlug });
};

const saveDiagnostics = async (cdp, error) => {
  await mkdir(diagnosticsDir, { recursive: true });
  const stamp = `${currentStep.viewport}-${currentStep.scenario}`.replace(/[^a-z0-9_-]+/gi, "-");
  const screenshot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }).catch(() => null);
  if (screenshot?.data) await writeFile(`${diagnosticsDir}/${stamp}.png`, Buffer.from(screenshot.data, "base64"));
  const dom = await evaluate(cdp, `document.documentElement.outerHTML`).catch(() => "");
  await writeFile(`${diagnosticsDir}/${stamp}.html`, dom);
  const visible = await evaluate(cdp, `Array.from(document.querySelectorAll('a,button,[role="button"]')).map((el) => { const r=el.getBoundingClientRect(); const s=getComputedStyle(el); return {tag:el.tagName,text:(el.textContent||'').trim().replace(/\\s+/g,' ').slice(0,160),aria:el.getAttribute('aria-label'),href:el.getAttribute('href'),dest:el.dataset.previewDestination||null,visible:r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'}; }).filter(x=>x.visible)`).catch(() => []);
  const history = await cdp.send("Page.getNavigationHistory").catch(() => ({}));
  const marker = await surfaceMarker(cdp).catch(() => ({}));
  const payload = { error: String(error?.stack || error), step: currentStep, url: await evaluate(cdp, "location.href").catch(() => ""), marker, visible, history, consoleErrors };
  await writeFile(`${diagnosticsDir}/${stamp}.json`, JSON.stringify(payload, null, 2));
  console.error("CLICK_SMOKE_DIAGNOSTIC", JSON.stringify(payload));
};

const runScenario = async (cdp, viewport) => {
  currentStep.viewport = viewport.name;
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: viewport.width < 640 });
  await cdp.send("Page.navigate", { url: `${base}visual-preview/public/home/` });
  await waitSurface(cdp, "public/home");

  await clickDestination(cdp, "public/login", { scenario: "PUBLIC", action: "Landing → Login" });
  await clickDestination(cdp, "student/dashboard", { scenario: "STUDENT", action: "Login → Dashboard" });
  await browserBackForward(cdp, "public/login", "student/dashboard", "PUBLIC_HISTORY");
  await clickDestination(cdp, "student/courses", { scenario: "STUDENT", action: "Dashboard → Meus cursos" });
  await clickDestination(cdp, "student/course", { scenario: "COURSE_MODULE_LESSON", action: "Meus cursos → Detalhe do curso" });
  await clickDestination(cdp, "student/lesson-video", { scenario: "COURSE_MODULE_LESSON", action: "Curso → Aula/player" });

  await clickDestination(cdp, "admin/dashboard", { navigator: true, scenario: "ADMIN", action: "Entrar Admin" });
  await clickDestination(cdp, "admin/courses", { scenario: "ADMIN", action: "Dashboard → Cursos" });
  await clickDestination(cdp, "admin/course-new", { scenario: "ADMIN", action: "Cursos → Novo curso" });
  await clickDestination(cdp, "admin/dashboard", { navigator: true, scenario: "ADMIN", action: "Retornar Dashboard Admin" });
  await clickDestination(cdp, "admin/products", { scenario: "ADMIN", action: "Dashboard → Produtos" });

  await clickDestination(cdp, "affiliate/active", { navigator: true, scenario: "AFFILIATE", action: "Entrar Affiliate" });
  await clickDestination(cdp, "affiliate/offers", { scenario: "AFFILIATE", action: "Visão geral → Ofertas" });
  await clickDestination(cdp, "affiliate/links", { scenario: "AFFILIATE", action: "Ofertas → Links" });
  await clickDestination(cdp, "affiliate/commissions", { scenario: "AFFILIATE", action: "Links → Comissões" });

  await clickDestination(cdp, "commerce/courses", { navigator: true, scenario: "COMMERCIAL", action: "Entrar Cursos" });
  await clickDestination(cdp, "commerce/checkout-processing", { scenario: "COMMERCIAL", action: "Curso → Checkout" });
  await clickDestination(cdp, "commerce/payment-success", { navigator: true, scenario: "COMMERCIAL", action: "Checkout → Sucesso" });
  console.log(`CLICK_SCENARIO_${viewport.name.toUpperCase()}=PASS`);
};

const chromePath = findChrome();
const port = 9444;
const chrome = spawn(chromePath, ["--headless=new", "--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--remote-allow-origins=*", `--remote-debugging-port=${port}`, "--user-data-dir=/tmp/visual-preview-click-chrome", "about:blank"], { stdio: ["ignore", "ignore", "ignore"] });

try {
  await waitJson(`http://127.0.0.1:${port}/json/version`);
  const target = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" }).then((response) => response.json());
  client = new Cdp(target.webSocketDebuggerUrl);
  await client.connect();
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  try {
    for (const viewport of [{ name: "desktop", width: 1440, height: 900 }, { name: "mobile", width: 390, height: 844 }]) await runScenario(client, viewport);
    console.log("PREVIEW_CLICK_SMOKE=PASS");
  } catch (error) {
    await logStep(client, "FAIL", { ERROR: String(error?.message || error) }).catch(() => undefined);
    await saveDiagnostics(client, error);
    throw error;
  } finally {
    client.close();
    await fetch(`http://127.0.0.1:${port}/json/close/${target.id}`).catch(() => undefined);
  }
} finally {
  chrome.kill("SIGTERM");
}

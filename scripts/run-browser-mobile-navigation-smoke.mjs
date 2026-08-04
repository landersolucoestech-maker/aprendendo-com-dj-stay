import { spawn, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";

import { CdpClient } from "./lib/cdp-client.mjs";

const root = process.cwd();
const artifactsDirectory = path.join(root, "artifacts", "browser-smoke");
const viteExecutable = path.join(root, "node_modules", "vite", "bin", "vite.js");
const menuButtonSelector =
  'nav[aria-label="Navegação principal"] button[aria-controls="mobile-navigation"]';
const mobileLoginSelector = '#mobile-navigation a[href="/login"]';
const delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));
const failures = [];

const resolveExecutable = (candidates) => {
  for (const candidate of candidates) {
    if (!candidate) continue;
    if (path.isAbsolute(candidate) && existsSync(candidate)) return candidate;
    const result = spawnSync("which", [candidate], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    if (result.status === 0 && result.stdout.trim()) return result.stdout.trim();
  }
  return null;
};

const browserExecutable = resolveExecutable([
  process.env.BROWSER_EXECUTABLE,
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "google-chrome",
  "google-chrome-stable",
  "chromium",
  "chromium-browser",
]);

if (!existsSync(viteExecutable)) failures.push(`Vite ausente: ${viteExecutable}`);
if (browserExecutable === null) {
  failures.push("Chrome ou Chromium não foi encontrado no runner.");
}
if (failures.length > 0) {
  console.error("Smoke B136 bloqueado:\n- " + failures.join("\n- "));
  process.exit(1);
}

mkdirSync(artifactsDirectory, { recursive: true });

const reserveLoopbackPort = () =>
  new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address === null || typeof address === "string") {
        server.close();
        reject(new Error("Não foi possível reservar uma porta TCP efêmera."));
        return;
      }
      server.close((error) => {
        if (error) reject(error);
        else resolve(address.port);
      });
    });
  });

const previewPort = await reserveLoopbackPort();
const browserDebugPort = await reserveLoopbackPort();
const baseUrl = `http://127.0.0.1:${previewPort}`;
const browserDebugUrl = `http://127.0.0.1:${browserDebugPort}`;
const profileDirectory = mkdtempSync(
  path.join(tmpdir(), "djstay-mobile-navigation-"),
);
const previewLogs = [];
const browserLogs = [];
const diagnostics = [];
const networkRecords = [];
let networkPhase = "initial-document";
let previewExited = false;
let browserExited = false;
let previewSpawnError = null;
let browserSpawnError = null;
let client = null;
let targetId = null;
let sessionId = null;
let finalState = null;
let menuTarget = null;
let loginTarget = null;
let networkSummary = null;
let removeEventListener = () => {};

const preview = spawn(
  process.execPath,
  [
    viteExecutable,
    "preview",
    "--host",
    "127.0.0.1",
    "--port",
    String(previewPort),
    "--strictPort",
  ],
  { cwd: root, env: process.env, stdio: ["ignore", "pipe", "pipe"] },
);
preview.stdout.on("data", (chunk) => previewLogs.push(String(chunk)));
preview.stderr.on("data", (chunk) => previewLogs.push(String(chunk)));
preview.once("error", (error) => {
  previewSpawnError = error;
});
const previewExit = new Promise((resolve) => {
  preview.once("exit", (code, signal) => {
    previewExited = true;
    resolve({ code, signal });
  });
});

const browser = spawn(
  browserExecutable,
  [
    "--headless=new",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--disable-background-networking",
    "--disable-component-update",
    "--disable-default-apps",
    "--disable-extensions",
    "--disable-sync",
    "--metrics-recording-only",
    "--no-first-run",
    "--mute-audio",
    "--hide-scrollbars",
    "--remote-debugging-address=127.0.0.1",
    `--remote-debugging-port=${browserDebugPort}`,
    "--remote-allow-origins=*",
    `--user-data-dir=${profileDirectory}`,
    "about:blank",
  ],
  { cwd: root, env: process.env, stdio: ["ignore", "pipe", "pipe"] },
);
browser.stdout.on("data", (chunk) => browserLogs.push(String(chunk)));
browser.stderr.on("data", (chunk) => browserLogs.push(String(chunk)));
browser.once("error", (error) => {
  browserSpawnError = error;
});
const browserExit = new Promise((resolve) => {
  browser.once("exit", (code, signal) => {
    browserExited = true;
    resolve({ code, signal });
  });
});

const stopProcess = async (processHandle, exitPromise, hasExited) => {
  if (hasExited() || processHandle.pid === undefined) return;
  processHandle.kill("SIGTERM");
  await Promise.race([exitPromise, delay(2_000)]);
  if (!hasExited()) {
    processHandle.kill("SIGKILL");
    await exitPromise;
  }
};

const removeProfileDirectory = async () => {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      rmSync(profileDirectory, { recursive: true, force: true });
      return;
    } catch (error) {
      const code = error instanceof Error ? error.code : undefined;
      const retryable = code === "ENOTEMPTY" || code === "EBUSY" || code === "EPERM";
      if (!retryable || attempt === 5) throw error;
      await delay(200 * (attempt + 1));
    }
  }
};

const waitForPreview = async () => {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (previewSpawnError !== null) throw previewSpawnError;
    if (previewExited) throw new Error(`Preview encerrou.\n${previewLogs.join("")}`);
    try {
      const response = await fetch(`${baseUrl}/`, {
        redirect: "error",
        signal: AbortSignal.timeout(5_000),
      });
      if (response.ok) return;
    } catch {
      // Inicialização ainda em andamento.
    }
    await delay(250);
  }
  throw new Error(`Preview indisponível.\n${previewLogs.join("")}`);
};

const waitForBrowserDebugger = async () => {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (browserSpawnError !== null) throw browserSpawnError;
    if (browserExited) throw new Error(`Chrome encerrou.\n${browserLogs.join("")}`);
    try {
      const response = await fetch(`${browserDebugUrl}/json/version`, {
        redirect: "error",
        signal: AbortSignal.timeout(3_000),
      });
      if (response.ok) {
        const version = await response.json();
        if (typeof version.webSocketDebuggerUrl === "string") {
          return version.webSocketDebuggerUrl;
        }
      }
    } catch {
      // CDP ainda em inicialização.
    }
    await delay(250);
  }
  throw new Error(`CDP indisponível.\n${browserLogs.join("")}`);
};

const serializeRuntimeException = (details) =>
  String(details.exception?.description ?? details.exception?.value ?? details.text);

const evaluate = async (expression) => {
  const response = await client.request(
    "Runtime.evaluate",
    { expression, returnByValue: true, awaitPromise: true },
    sessionId,
  );
  if (response.exceptionDetails) {
    throw new Error(serializeRuntimeException(response.exceptionDetails));
  }
  return response.result?.value;
};

const readState = () =>
  evaluate(`(() => {
    const main = document.getElementById("main-content");
    const menuButton = document.querySelector(${JSON.stringify(menuButtonSelector)});
    const liveRegions = Array.from(
      document.querySelectorAll('[aria-live="polite"][aria-atomic="true"]'),
    );
    return {
      pathname: window.location.pathname,
      html: document.documentElement.outerHTML,
      mainText: main?.textContent ?? "",
      activeElementId: document.activeElement?.id ?? null,
      activeElementConnected: document.activeElement?.isConnected ?? false,
      menuExists: Boolean(document.getElementById("mobile-navigation")),
      menuExpanded: menuButton?.getAttribute("aria-expanded") ?? null,
      menuLabel: menuButton?.getAttribute("aria-label") ?? null,
      announcement: liveRegions
        .map((region) => region.textContent?.trim() ?? "")
        .find((text) => text.includes("Navegação concluída")) ?? "",
      interactions: window.__b136InteractionProbe ?? [],
    };
  })()`);

const waitForState = async (predicate, attempts = 80) => {
  let state = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    state = await readState();
    if (predicate(state)) return state;
    await delay(250);
  }
  return state;
};

const prepareTarget = (selector, expectedText) =>
  evaluate(`(() => {
    const selector = ${JSON.stringify(selector)};
    const candidates = Array.from(document.querySelectorAll(selector));
    const element = candidates.find((candidate) => {
      const rect = candidate.getBoundingClientRect();
      const style = getComputedStyle(candidate);
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity) > 0
      );
    });
    if (!(element instanceof HTMLElement)) {
      return { error: "Controle móvel visível não encontrado.", selector };
    }
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const hit = document.elementFromPoint(x, y)?.closest(selector);
    if (hit !== element) {
      return { error: "Controle móvel não é o alvo superior.", selector };
    }
    const text = element.textContent?.trim() ?? "";
    if (${JSON.stringify(expectedText)} && text !== ${JSON.stringify(expectedText)}) {
      return { error: "Texto do controle móvel divergente.", selector, text };
    }
    return {
      selector,
      x,
      y,
      width: rect.width,
      height: rect.height,
      text,
      ariaLabel: element.getAttribute("aria-label"),
      href: element instanceof HTMLAnchorElement ? element.href : null,
      pathname:
        element instanceof HTMLAnchorElement ? new URL(element.href).pathname : null,
    };
  })()`);

const dispatchTrustedClick = async (target) => {
  await client.request(
    "Input.dispatchMouseEvent",
    { type: "mouseMoved", x: target.x, y: target.y },
    sessionId,
  );
  await client.request(
    "Input.dispatchMouseEvent",
    {
      type: "mousePressed",
      x: target.x,
      y: target.y,
      button: "left",
      buttons: 1,
      clickCount: 1,
    },
    sessionId,
  );
  await client.request(
    "Input.dispatchMouseEvent",
    {
      type: "mouseReleased",
      x: target.x,
      y: target.y,
      button: "left",
      buttons: 0,
      clickCount: 1,
    },
    sessionId,
  );
};

const validateNetwork = () => {
  const requests = networkRecords.filter((entry) => entry.kind === "request");
  const responses = networkRecords.filter((entry) => entry.kind === "response");
  const documents = requests.filter((entry) => entry.resourceType === "Document");
  let documentUrl = null;

  if (documents.length !== 1) {
    failures.push(`B136 esperava um único Document inicial, recebeu ${documents.length}.`);
  } else {
    try {
      documentUrl = new URL(documents[0].url);
      if (documentUrl.pathname !== "/") {
        failures.push(`Document inicial B136 inesperado: ${documentUrl.pathname}`);
      }
    } catch {
      failures.push(`URL do Document B136 inválida: ${documents[0].url}`);
    }
  }

  const navigationDocuments = documents.filter(
    (entry) => entry.phase === "client-navigation",
  );
  if (navigationDocuments.length !== 0) {
    failures.push("A navegação móvel B136 criou novo Document para /login.");
  }

  const outOfOrigin = [];
  if (documentUrl !== null) {
    for (const request of requests) {
      let requestUrl;
      try {
        requestUrl = new URL(request.url);
      } catch {
        failures.push(`URL de request B136 inválida: ${request.url}`);
        continue;
      }
      if (
        (requestUrl.protocol === "http:" || requestUrl.protocol === "https:") &&
        requestUrl.origin !== documentUrl.origin
      ) {
        outOfOrigin.push(request.url);
      }
    }
  }
  for (const url of outOfOrigin) {
    failures.push(`Request móvel B136 saiu da origem do documento: ${url}`);
  }

  const failedResponses = responses.filter((entry) => Number(entry.status) >= 400);
  for (const response of failedResponses) {
    failures.push(`Resposta HTTP móvel B136 ${response.status}: ${response.url}`);
  }

  return {
    documentOrigin: documentUrl?.origin ?? null,
    documentRequestCount: documents.length,
    navigationDocumentRequestCount: navigationDocuments.length,
    requestCount: requests.length,
    responseCount: responses.length,
    outOfOriginRequestCount: outOfOrigin.length,
    failedResponseCount: failedResponses.length,
  };
};

try {
  await waitForPreview();
  client = await CdpClient.connect(await waitForBrowserDebugger());

  const target = await client.request("Target.createTarget", {
    url: "about:blank",
    background: false,
  });
  targetId = target.targetId;
  const attached = await client.request("Target.attachToTarget", {
    targetId,
    flatten: true,
  });
  sessionId = attached.sessionId;

  removeEventListener = client.addEventListener((packet) => {
    if (packet.sessionId !== sessionId) return;
    if (packet.method === "Runtime.exceptionThrown") {
      diagnostics.push({
        level: "exception",
        text: serializeRuntimeException(packet.params.exceptionDetails),
      });
    } else if (packet.method === "Log.entryAdded") {
      diagnostics.push({
        level: packet.params.entry.level,
        source: packet.params.entry.source,
        text: packet.params.entry.text,
      });
    } else if (packet.method === "Network.requestWillBeSent") {
      networkRecords.push({
        kind: "request",
        phase: networkPhase,
        requestId: packet.params.requestId,
        method: packet.params.request.method,
        url: packet.params.request.url,
        resourceType: packet.params.type,
      });
    } else if (packet.method === "Network.responseReceived") {
      networkRecords.push({
        kind: "response",
        phase: networkPhase,
        requestId: packet.params.requestId,
        status: packet.params.response.status,
        url: packet.params.response.url,
        resourceType: packet.params.type,
      });
    }
  });

  await Promise.all([
    client.request("Page.enable", {}, sessionId),
    client.request("Runtime.enable", {}, sessionId),
    client.request("Log.enable", {}, sessionId),
    client.request("Network.enable", {}, sessionId),
  ]);
  await client.request(
    "Emulation.setDeviceMetricsOverride",
    {
      width: 390,
      height: 844,
      screenWidth: 390,
      screenHeight: 844,
      deviceScaleFactor: 1,
      mobile: true,
    },
    sessionId,
  );

  const loaded = client.waitForEvent("Page.loadEventFired", sessionId, 20_000);
  const navigation = await client.request(
    "Page.navigate",
    { url: `${baseUrl}/` },
    sessionId,
    20_000,
  );
  if (navigation.errorText) throw new Error(navigation.errorText);
  await loaded;

  const homeState = await waitForState(
    (state) =>
      state?.pathname === "/" &&
      state.mainText.includes("Conteúdo publicado pelo instrutor") &&
      state.menuExists === false &&
      state.menuExpanded === "false" &&
      state.menuLabel === "Abrir menu",
  );
  if (homeState?.menuLabel !== "Abrir menu") {
    throw new Error("A home móvel B136 não ficou pronta com menu fechado.");
  }

  await evaluate(`(() => {
    window.__b136InteractionProbe = [];
    const menuSelector = ${JSON.stringify(menuButtonSelector)};
    const loginSelector = ${JSON.stringify(mobileLoginSelector)};
    document.addEventListener("click", (event) => {
      if (!(event.target instanceof Element)) return;
      const menuTarget = event.target.closest(menuSelector);
      const loginTarget = event.target.closest(loginSelector);
      const target = menuTarget ?? loginTarget;
      if (!target) return;
      window.__b136InteractionProbe.push({
        kind: menuTarget ? "menu-toggle" : "login-link",
        isTrusted: event.isTrusted,
        defaultPrevented: event.defaultPrevented,
        button: event.button,
        detail: event.detail,
        text: target.textContent?.trim() ?? "",
        ariaLabel: target.getAttribute("aria-label"),
        pathname:
          target instanceof HTMLAnchorElement
            ? new URL(target.href).pathname
            : null,
      });
    }, true);
  })()`);

  networkPhase = "mobile-menu-open";
  networkRecords.push({
    kind: "phase",
    phase: networkPhase,
    pathname: "/",
    interaction: "trusted-click",
    selector: menuButtonSelector,
  });

  menuTarget = await prepareTarget(menuButtonSelector, "");
  if (menuTarget?.error || menuTarget?.ariaLabel !== "Abrir menu") {
    throw new Error(`Alvo do menu B136 inválido: ${JSON.stringify(menuTarget)}`);
  }
  await dispatchTrustedClick(menuTarget);

  const openState = await waitForState(
    (state) =>
      state?.menuExists === true &&
      state.menuExpanded === "true" &&
      state.menuLabel === "Fechar menu" &&
      state.interactions.some(
        (interaction) =>
          interaction.kind === "menu-toggle" && interaction.isTrusted === true,
      ),
  );
  if (openState?.menuExists !== true) {
    throw new Error("O clique real B136 não abriu o menu móvel.");
  }

  loginTarget = await prepareTarget(mobileLoginSelector, "Entrar");
  if (
    loginTarget?.error ||
    loginTarget?.text !== "Entrar" ||
    loginTarget?.pathname !== "/login"
  ) {
    throw new Error(`Alvo Entrar móvel B136 inválido: ${JSON.stringify(loginTarget)}`);
  }

  await client.request(
    "Network.emulateNetworkConditions",
    {
      offline: false,
      latency: 500,
      downloadThroughput: 64 * 1024,
      uploadThroughput: 64 * 1024,
      connectionType: "cellular3g",
    },
    sessionId,
  );

  networkPhase = "client-navigation";
  networkRecords.push({
    kind: "phase",
    phase: networkPhase,
    pathname: "/login",
    interaction: "trusted-click",
    selector: mobileLoginSelector,
  });
  await dispatchTrustedClick(loginTarget);

  finalState = await waitForState(
    (state) =>
      state?.pathname === "/login" &&
      state.mainText.includes("Acesse sua conta para continuar aprendendo.") &&
      state.mainText.includes("Esqueceu a senha?") &&
      state.menuExists === false &&
      state.activeElementId === "main-content" &&
      state.activeElementConnected === true &&
      state.announcement.includes(
        "Navegação concluída. Conteúdo principal atualizado.",
      ) &&
      state.interactions.some(
        (interaction) =>
          interaction.kind === "login-link" &&
          interaction.isTrusted === true &&
          interaction.pathname === "/login",
      ),
    100,
  );

  if (finalState?.pathname !== "/login") {
    failures.push("O link Entrar móvel B136 não navegou para /login.");
  }
  if (finalState?.menuExists !== false) {
    failures.push("O menu móvel B136 permaneceu aberto após a navegação.");
  }
  if (finalState?.activeElementId !== "main-content") {
    failures.push("O foco final móvel B136 não está em #main-content.");
  }
  if (finalState?.activeElementConnected !== true) {
    failures.push("O foco final móvel B136 não está conectado ao DOM.");
  }
  if (
    !finalState?.announcement?.includes(
      "Navegação concluída. Conteúdo principal atualizado.",
    )
  ) {
    failures.push("A navegação móvel B136 não foi anunciada.");
  }

  const menuInteraction = finalState?.interactions?.find(
    (interaction) => interaction.kind === "menu-toggle",
  );
  const loginInteraction = finalState?.interactions?.find(
    (interaction) => interaction.kind === "login-link",
  );
  if (menuInteraction?.isTrusted !== true) {
    failures.push("O clique no botão do menu B136 não foi confiável.");
  }
  if (loginInteraction?.isTrusted !== true) {
    failures.push("O clique no link Entrar móvel B136 não foi confiável.");
  }
  if (loginInteraction?.pathname !== "/login") {
    failures.push("O link Entrar móvel B136 não apontava para /login.");
  }

  for (const exception of diagnostics.filter(
    (entry) => entry.level === "exception",
  )) {
    failures.push(`Exceção JavaScript B136: ${exception.text}`);
  }
  networkSummary = validateNetwork();
} catch (error) {
  failures.push(
    `Execução B136 falhou: ${error instanceof Error ? error.message : String(error)}`,
  );
  networkSummary = validateNetwork();
} finally {
  removeEventListener();
  if (client !== null && targetId !== null) {
    try {
      await client.request("Target.closeTarget", { targetId });
    } catch {
      // O processo do navegador será encerrado abaixo.
    }
  }
  if (client !== null) client.close();

  writeFileSync(
    path.join(artifactsDirectory, "mobile-navigation.html"),
    finalState?.html ?? "",
    "utf8",
  );
  writeFileSync(
    path.join(artifactsDirectory, "mobile-navigation.runtime.json"),
    `${JSON.stringify(diagnostics, null, 2)}\n`,
    "utf8",
  );
  writeFileSync(
    path.join(artifactsDirectory, "mobile-navigation.evidence.json"),
    `${JSON.stringify(
      {
        viewport: { width: 390, height: 844, mobile: true },
        targets: { menu: menuTarget, login: loginTarget },
        interactions: finalState?.interactions ?? [],
        finalState,
        networkSummary,
        networkRecords,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  writeFileSync(
    path.join(artifactsDirectory, "mobile-navigation.chrome.log"),
    browserLogs.join(""),
    "utf8",
  );
  writeFileSync(
    path.join(artifactsDirectory, "mobile-navigation.preview.log"),
    previewLogs.join(""),
    "utf8",
  );

  await stopProcess(browser, browserExit, () => browserExited);
  await stopProcess(preview, previewExit, () => previewExited);
  try {
    await removeProfileDirectory();
  } catch (error) {
    failures.push(
      `Limpeza do perfil temporário B136 falhou: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

if (failures.length > 0) {
  console.error("Smoke B136 inválido:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(
  "Smoke B136 aprovado: menu móvel e link Entrar foram acionados por cliques confiáveis, o menu fechou, o login recebeu foco e anúncio, e a navegação permaneceu no documento e origem iniciais.",
);
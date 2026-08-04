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

if (!existsSync(viteExecutable)) {
  failures.push(`Vite ausente: ${viteExecutable}`);
}
if (browserExecutable === null) {
  failures.push("Chrome ou Chromium não foi encontrado no runner.");
}
if (failures.length > 0) {
  console.error("Smoke B125/B132 bloqueado:\n- " + failures.join("\n- "));
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
  path.join(tmpdir(), "djstay-focus-handoff-"),
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
  {
    cwd: root,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  },
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
    "--window-size=1440,1000",
    "--remote-debugging-address=127.0.0.1",
    `--remote-debugging-port=${browserDebugPort}`,
    "--remote-allow-origins=*",
    `--user-data-dir=${profileDirectory}`,
    "about:blank",
  ],
  {
    cwd: root,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  },
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
    if (previewExited) {
      throw new Error(`Preview encerrou prematuramente.\n${previewLogs.join("")}`);
    }
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
    if (browserExited) {
      throw new Error(`Chrome encerrou prematuramente.\n${browserLogs.join("")}`);
    }
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

const serializeRuntimeException = (details) => {
  const description =
    details.exception?.description ?? details.exception?.value ?? details.text;
  const frames = details.stackTrace?.callFrames ?? [];
  const stack = frames
    .slice(0, 12)
    .map(
      (frame) =>
        `${frame.functionName || "<anonymous>"} (${frame.url}:${frame.lineNumber + 1}:${frame.columnNumber + 1})`,
    )
    .join("\n");
  return stack ? `${description}\n${stack}` : String(description);
};

const evaluate = async (session, expression) => {
  const response = await client.request(
    "Runtime.evaluate",
    {
      expression,
      returnByValue: true,
      awaitPromise: true,
    },
    session,
  );
  if (response.exceptionDetails) {
    throw new Error(serializeRuntimeException(response.exceptionDetails));
  }
  return response.result?.value;
};

const readState = (session) =>
  evaluate(
    session,
    `(() => {
      const main = document.getElementById("main-content");
      const liveRegions = Array.from(
        document.querySelectorAll('[aria-live="polite"][aria-atomic="true"]'),
      );
      return {
        pathname: window.location.pathname,
        html: document.documentElement.outerHTML,
        mainCount: document.querySelectorAll("#main-content").length,
        mainText: main?.textContent ?? "",
        focusDeferredCount: document.querySelectorAll(
          '[data-route-focus-deferred="true"]',
        ).length,
        activeElementId: document.activeElement?.id ?? null,
        activeElementConnected: document.activeElement?.isConnected ?? false,
        announcement: liveRegions
          .map((region) => region.textContent?.trim() ?? "")
          .find((text) => text.includes("Navegação concluída")) ?? "",
        probe: window.__b125RouteFocusProbe ?? null,
      };
    })()`,
  );

const waitForHome = async (session) => {
  let state = null;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    state = await readState(session);
    if (
      state?.pathname === "/" &&
      state.mainCount === 1 &&
      state.mainText.includes("Conteúdo publicado pelo instrutor")
    ) {
      return state;
    }
    await delay(250);
  }
  return state;
};

const waitForFinalFocus = async (session) => {
  let state = null;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    state = await readState(session);
    if (
      state?.pathname === "/login" &&
      state.mainCount === 1 &&
      state.mainText.includes("Acesse sua conta para continuar aprendendo.") &&
      state.mainText.includes("Esqueceu a senha?") &&
      state.focusDeferredCount === 0 &&
      state.activeElementId === "main-content" &&
      state.activeElementConnected === true &&
      state.announcement.includes(
        "Navegação concluída. Conteúdo principal atualizado.",
      ) &&
      state.probe?.sawDeferred === true &&
      state.probe?.deferredFocused === false
    ) {
      return state;
    }
    await delay(250);
  }
  return state;
};

try {
  await waitForPreview();
  const debuggerUrl = await waitForBrowserDebugger();
  client = await CdpClient.connect(debuggerUrl);

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
      width: 1440,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
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

  const homeState = await waitForHome(sessionId);
  if (!homeState?.mainText.includes("Conteúdo publicado pelo instrutor")) {
    throw new Error("A home não ficou pronta antes da transição B125/B132.");
  }

  await evaluate(
    sessionId,
    `(() => {
      const probe = {
        sawDeferred: false,
        deferredFocused: false,
      };
      const record = () => {
        const deferred = document.querySelector(
          '[data-route-focus-deferred="true"]',
        );
        if (!deferred) return;
        probe.sawDeferred = true;
        if (document.activeElement === deferred) {
          probe.deferredFocused = true;
        }
      };
      const observer = new MutationObserver(record);
      observer.observe(document.getElementById("root") ?? document.documentElement, {
        childList: true,
        subtree: true,
      });
      window.__b125RouteFocusProbe = probe;
      window.__b125RouteFocusObserver = observer;
      record();
    })()`,
  );

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
  });

  const pathname = await evaluate(
    sessionId,
    `(() => {
      window.history.pushState({ b125: true, b132: true }, "", "/login");
      window.dispatchEvent(
        new PopStateEvent("popstate", { state: { b125: true, b132: true } }),
      );
      return window.location.pathname;
    })()`,
  );
  if (pathname !== "/login") {
    throw new Error(`Pathname inesperado após pushState: ${String(pathname)}`);
  }

  finalState = await waitForFinalFocus(sessionId);
  await evaluate(
    sessionId,
    "window.__b125RouteFocusObserver?.disconnect(); true",
  );

  if (finalState?.probe?.sawDeferred !== true) {
    failures.push("A transição B125 não observou o fallback com foco diferido.");
  }
  if (finalState?.probe?.deferredFocused !== false) {
    failures.push("O fallback B125 recebeu foco durante a navegação.");
  }
  if (finalState?.focusDeferredCount !== 0) {
    failures.push("O conteúdo final ainda possui marcador de foco diferido.");
  }
  if (finalState?.activeElementId !== "main-content") {
    failures.push("O foco final não está em #main-content.");
  }
  if (finalState?.activeElementConnected !== true) {
    failures.push("O elemento ativo final não está conectado ao DOM.");
  }
  if (
    !finalState?.announcement?.includes(
      "Navegação concluída. Conteúdo principal atualizado.",
    )
  ) {
    failures.push("A live region não anunciou a conclusão da navegação.");
  }
  for (const exception of diagnostics.filter(
    (entry) => entry.level === "exception",
  )) {
    failures.push(`Exceção JavaScript B125/B132: ${exception.text}`);
  }
  for (const response of networkRecords.filter(
    (entry) => entry.kind === "response" && Number(entry.status) >= 400,
  )) {
    failures.push(
      `Resposta HTTP B132 inesperada ${response.status} em ${response.url}`,
    );
  }
} catch (error) {
  failures.push(
    `Execução B125/B132 falhou: ${error instanceof Error ? error.message : String(error)}`,
  );
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
    path.join(artifactsDirectory, "client-navigation.html"),
    finalState?.html ?? "",
    "utf8",
  );
  writeFileSync(
    path.join(artifactsDirectory, "client-navigation.runtime.json"),
    `${JSON.stringify(diagnostics, null, 2)}\n`,
    "utf8",
  );
  writeFileSync(
    path.join(artifactsDirectory, "client-navigation.network.json"),
    `${JSON.stringify(networkRecords, null, 2)}\n`,
    "utf8",
  );
  writeFileSync(
    path.join(artifactsDirectory, "client-navigation.probe.json"),
    `${JSON.stringify(finalState, null, 2)}\n`,
    "utf8",
  );
  writeFileSync(
    path.join(artifactsDirectory, "client-navigation.chrome.log"),
    browserLogs.join(""),
    "utf8",
  );
  writeFileSync(
    path.join(artifactsDirectory, "client-navigation.preview.log"),
    previewLogs.join(""),
    "utf8",
  );

  await stopProcess(browser, browserExit, () => browserExited);
  await stopProcess(preview, previewExit, () => previewExited);
  try {
    await removeProfileDirectory();
  } catch (error) {
    failures.push(
      `Limpeza do perfil temporário B132 falhou: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

if (failures.length > 0) {
  console.error("Smoke B125/B132 inválido:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(
  "Smoke B125/B132 aprovado: fallback lazy nunca recebeu foco, login final foi focado e anunciado, e a rede completa da navegação client-side foi persistida.",
);

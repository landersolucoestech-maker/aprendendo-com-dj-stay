import { spawn, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";

import { CdpClient } from "./lib/cdp-client.mjs";

const root = process.cwd();
const paths = {
  distIndex: path.join(root, "dist", "index.html"),
  vite: path.join(root, "node_modules", "vite", "bin", "vite.js"),
  artifacts: path.join(root, "artifacts", "browser-smoke"),
};

const failures = [];
const delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

for (const [name, filePath] of Object.entries({
  distIndex: paths.distIndex,
  vite: paths.vite,
})) {
  if (!existsSync(filePath)) failures.push(`Arquivo B118 ausente (${name}): ${filePath}`);
}

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

if (browserExecutable === null) {
  failures.push("Chrome ou Chromium não foi encontrado no runner.");
}

if (failures.length > 0) {
  console.error("Smoke B118 bloqueado:\n- " + failures.join("\n- "));
  process.exit(1);
}

mkdirSync(paths.artifacts, { recursive: true });
const compiledIndex = readFileSync(paths.distIndex, "utf8");
if (!compiledIndex.includes("Aprendendo com DJ Stay")) {
  console.error("Smoke B118 bloqueado: dist/index.html não possui a identidade operacional.");
  process.exit(1);
}

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
const previewLogs = [];
const browserLogs = [];
const browserProfileDirectory = mkdtempSync(
  path.join(tmpdir(), "djstay-browser-profile-"),
);
let previewExited = false;
let previewSpawnError = null;
let browserExited = false;
let browserSpawnError = null;
let cdpClient = null;

const preview = spawn(
  process.execPath,
  [
    paths.vite,
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
    `--user-data-dir=${browserProfileDirectory}`,
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

const fetchPreview = () =>
  fetch(`${baseUrl}/`, {
    redirect: "error",
    signal: AbortSignal.timeout(5_000),
  });

const waitForPreview = async () => {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (previewSpawnError !== null) throw previewSpawnError;
    if (previewExited) {
      throw new Error(
        `vite preview encerrou antes de ficar disponível.\n${previewLogs.join("")}`,
      );
    }
    try {
      const response = await fetchPreview();
      if (response.ok) return;
    } catch {
      // O processo ainda pode estar inicializando.
    }
    await delay(250);
  }
  throw new Error(
    `vite preview não respondeu no limite definido.\n${previewLogs.join("")}`,
  );
};

const waitForBrowserDebugger = async () => {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (browserSpawnError !== null) throw browserSpawnError;
    if (browserExited) {
      throw new Error(
        `Chrome encerrou antes de disponibilizar o CDP.\n${browserLogs.join("")}`,
      );
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
      // O endpoint de debugging ainda pode estar inicializando.
    }
    await delay(250);
  }

  throw new Error(
    `Chrome DevTools Protocol não ficou disponível.\n${browserLogs.join("")}`,
  );
};

const stopProcess = async (processHandle, exitPromise, hasExited) => {
  if (hasExited() || processHandle.pid === undefined) return;
  processHandle.kill("SIGTERM");
  await Promise.race([exitPromise, delay(2_000)]);
  if (!hasExited()) {
    processHandle.kill("SIGKILL");
    await exitPromise;
  }
};

const routes = [
  {
    name: "home",
    pathname: "/",
    required: ["Conteúdo publicado pelo instrutor", "Ver catálogo publicado"],
  },
  {
    name: "login",
    pathname: "/login",
    required: ["Acesse sua conta para continuar aprendendo.", "Esqueceu a senha?"],
  },
  {
    name: "certificate",
    pathname: "/certificado",
    required: ["Validar certificado", "Formato: DJSTAY- seguido por 20 caracteres hexadecimais."],
  },
  {
    name: "contact",
    pathname: "/contato",
    required: ["Solicitação de contato", "Registrar solicitação"],
  },
  {
    name: "register",
    pathname: "/matricule-se",
    required: ["Matricule-se", "Crie sua conta para acessar a plataforma."],
  },
  {
    name: "forgot-password",
    pathname: "/esqueceu-senha",
    required: ["Recuperar senha", "Enviar instruções"],
  },
  {
    name: "access-denied",
    pathname: "/acesso-negado",
    required: ["Acesso negado", "Sua sessão não possui acesso a esta página."],
  },
  {
    name: "not-found",
    pathname: "/rota-inexistente-b122",
    required: ["Página não encontrada", "Voltar ao início"],
  },
];

const forbiddenContent = [
  "Esta página não pôde ser carregada",
  "Lovable Generated Project",
  "cdn.gpteng.co",
  "gptengineer.js",
];

const valueFromRemoteObject = (remoteObject) => {
  if (Object.hasOwn(remoteObject, "value")) return remoteObject.value;
  return remoteObject.description ?? remoteObject.type ?? "valor indisponível";
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

const evaluatePageState = async (client, sessionId) => {
  const response = await client.request(
    "Runtime.evaluate",
    {
      expression: `(() => {
        const root = document.getElementById("root");
        const mainContent = document.getElementById("main-content");
        const skipLinks = Array.from(
          document.querySelectorAll('a[href="#main-content"]'),
        );
        return {
          lang: document.documentElement.lang,
          title: document.title,
          rootExists: Boolean(root),
          rootHtml: root?.innerHTML ?? "",
          mainContentCount: document.querySelectorAll("#main-content").length,
          mainContentIsLandmark: Boolean(
            mainContent?.matches('main, [role="main"]'),
          ),
          mainContentTabIndex: mainContent?.getAttribute("tabindex") ?? null,
          skipLinkCount: skipLinks.length,
          skipLinkText: skipLinks
            .map((link) => link.textContent?.trim() ?? "")
            .join(" "),
          liveRegionCount: document.querySelectorAll(
            '[aria-live="polite"][aria-atomic="true"]',
          ).length,
          html: document.documentElement.outerHTML
        };
      })()`,
      returnByValue: true,
      awaitPromise: true,
    },
    sessionId,
  );

  if (response.exceptionDetails) {
    throw new Error(
      `Runtime.evaluate falhou: ${serializeRuntimeException(response.exceptionDetails)}`,
    );
  }

  return response.result?.value ?? null;
};

const waitForRouteReady = async (client, sessionId, route) => {
  let lastState = null;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    lastState = await evaluatePageState(client, sessionId);
    const dom = lastState?.html ?? "";
    const requiredContentReady = route.required.every((fragment) =>
      dom.includes(fragment),
    );
    const accessibilityReady =
      lastState?.mainContentCount === 1 &&
      lastState.mainContentIsLandmark === true &&
      lastState.mainContentTabIndex === "-1" &&
      lastState.skipLinkCount === 1 &&
      lastState.skipLinkText.includes("Pular para o conteúdo principal") &&
      lastState.liveRegionCount >= 1;

    if (
      lastState?.rootHtml?.trim() &&
      requiredContentReady &&
      accessibilityReady
    ) {
      return lastState;
    }
    await delay(250);
  }
  return lastState;
};

const runRoute = async (client, route) => {
  const diagnostics = [];
  let targetId = null;
  let sessionId = null;
  let removeEventListener = () => {};

  try {
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
          source: "runtime",
          text: serializeRuntimeException(packet.params.exceptionDetails),
        });
      } else if (packet.method === "Runtime.consoleAPICalled") {
        diagnostics.push({
          level: packet.params.type,
          source: "console",
          text: packet.params.args.map(valueFromRemoteObject).join(" "),
        });
      } else if (packet.method === "Log.entryAdded") {
        const entry = packet.params.entry;
        diagnostics.push({
          level: entry.level,
          source: entry.source,
          text: entry.text,
          ...(entry.url ? { url: entry.url } : {}),
        });
      }
    });

    await Promise.all([
      client.request("Page.enable", {}, sessionId),
      client.request("Runtime.enable", {}, sessionId),
      client.request("Log.enable", {}, sessionId),
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
      { url: `${baseUrl}${route.pathname}` },
      sessionId,
      20_000,
    );
    if (navigation.errorText) {
      throw new Error(`Navegação falhou: ${navigation.errorText}`);
    }
    await loaded;

    const state = await waitForRouteReady(client, sessionId, route);
    const dom = state?.html ?? "";

    writeFileSync(
      path.join(paths.artifacts, `${route.name}.html`),
      dom,
      "utf8",
    );
    writeFileSync(
      path.join(paths.artifacts, `${route.name}.runtime.json`),
      `${JSON.stringify(diagnostics, null, 2)}\n`,
      "utf8",
    );

    if (!state?.rootExists) {
      failures.push(`${route.pathname}: elemento #root ausente.`);
    } else if (!state.rootHtml.trim()) {
      const runtimeExceptions = diagnostics
        .filter((entry) => entry.level === "exception")
        .map((entry) => entry.text)
        .join(" | ");
      failures.push(
        `${route.pathname}: React não renderizou o elemento #root no limite definido.${runtimeExceptions ? ` Exceção: ${runtimeExceptions}` : " Consulte o artefato runtime.json."}`,
      );
    }

    if (state?.lang !== "pt-BR") {
      failures.push(`${route.pathname}: idioma pt-BR ausente no DOM renderizado.`);
    }
    if (state?.title !== "Aprendendo com DJ Stay") {
      failures.push(`${route.pathname}: título operacional ausente no DOM renderizado.`);
    }
    if (state?.mainContentCount !== 1) {
      failures.push(
        `${route.pathname}: esperado exatamente um #main-content, recebido ${String(state?.mainContentCount ?? 0)}.`,
      );
    }
    if (state?.mainContentIsLandmark !== true) {
      failures.push(`${route.pathname}: #main-content não é um landmark principal.`);
    }
    if (state?.mainContentTabIndex !== "-1") {
      failures.push(`${route.pathname}: #main-content deve possuir tabindex="-1".`);
    }
    if (state?.skipLinkCount !== 1) {
      failures.push(
        `${route.pathname}: esperado exatamente um skip link, recebido ${String(state?.skipLinkCount ?? 0)}.`,
      );
    }
    if (!state?.skipLinkText?.includes("Pular para o conteúdo principal")) {
      failures.push(`${route.pathname}: texto operacional do skip link ausente.`);
    }
    if (!state?.liveRegionCount || state.liveRegionCount < 1) {
      failures.push(`${route.pathname}: live region de navegação ausente.`);
    }

    for (const fragment of route.required) {
      if (!dom.includes(fragment)) {
        failures.push(`${route.pathname}: conteúdo renderizado ausente: ${fragment}`);
      }
    }
    for (const fragment of forbiddenContent) {
      if (dom.includes(fragment)) {
        failures.push(`${route.pathname}: conteúdo proibido renderizado: ${fragment}`);
      }
    }

    const runtimeExceptions = diagnostics.filter(
      (entry) => entry.level === "exception",
    );
    for (const exception of runtimeExceptions) {
      failures.push(`${route.pathname}: exceção JavaScript não tratada: ${exception.text}`);
    }
  } finally {
    removeEventListener();
    if (targetId !== null) {
      try {
        await client.request("Target.closeTarget", { targetId });
      } catch (error) {
        failures.push(
          `${route.pathname}: não foi possível fechar o target: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }
};

try {
  await waitForPreview();
  const webSocketDebuggerUrl = await waitForBrowserDebugger();
  cdpClient = await CdpClient.connect(webSocketDebuggerUrl);

  for (const route of routes) {
    await runRoute(cdpClient, route);
  }
} catch (error) {
  failures.push(
    `Execução do navegador falhou: ${error instanceof Error ? error.message : String(error)}`,
  );
} finally {
  if (cdpClient !== null) cdpClient.close();

  writeFileSync(
    path.join(paths.artifacts, "chrome-process.log"),
    browserLogs.join(""),
    "utf8",
  );
  writeFileSync(
    path.join(paths.artifacts, "preview-process.log"),
    previewLogs.join(""),
    "utf8",
  );

  await stopProcess(browser, browserExit, () => browserExited);
  await stopProcess(preview, previewExit, () => previewExited);
  rmSync(browserProfileDirectory, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error("Smoke B118/B122/B123 inválido:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(
  `Smoke B118/B122/B123 aprovado em ${browserExecutable}: CDP aguardou conteúdo e prontidão acessível em oito rotas públicas sem exceções não tratadas.`,
);

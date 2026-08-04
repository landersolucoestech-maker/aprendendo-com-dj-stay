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

const port = await reserveLoopbackPort();
const baseUrl = `http://127.0.0.1:${port}`;
const previewLogs = [];
let previewExited = false;
let previewSpawnError = null;

const preview = spawn(
  process.execPath,
  [
    paths.vite,
    "preview",
    "--host",
    "127.0.0.1",
    "--port",
    String(port),
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

const stopPreview = async () => {
  if (previewExited || preview.pid === undefined) return;
  preview.kill("SIGTERM");
  await Promise.race([previewExit, delay(2_000)]);
  if (!previewExited) {
    preview.kill("SIGKILL");
    await previewExit;
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
];

const forbiddenContent = [
  "Esta página não pôde ser carregada",
  "Lovable Generated Project",
  "cdn.gpteng.co",
  "gptengineer.js",
];

const runRoute = (route) => {
  const profileDirectory = mkdtempSync(
    path.join(tmpdir(), `djstay-browser-${route.name}-`),
  );
  try {
    const result = spawnSync(
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
        "--virtual-time-budget=10000",
        `--user-data-dir=${profileDirectory}`,
        "--dump-dom",
        `${baseUrl}${route.pathname}`,
      ],
      {
        cwd: root,
        encoding: "utf8",
        maxBuffer: 30 * 1024 * 1024,
        timeout: 30_000,
        env: process.env,
      },
    );

    if (result.error) {
      failures.push(`${route.pathname}: Chrome falhou: ${result.error.message}`);
      return;
    }
    if (result.status !== 0) {
      failures.push(
        `${route.pathname}: Chrome encerrou com status ${String(result.status)}. ${result.stderr.trim()}`,
      );
      return;
    }

    const dom = result.stdout;
    writeFileSync(
      path.join(paths.artifacts, `${route.name}.html`),
      dom,
      "utf8",
    );

    if (!/<html\s+lang="pt-BR"/i.test(dom)) {
      failures.push(`${route.pathname}: idioma pt-BR ausente no DOM renderizado.`);
    }
    if (!dom.includes("<title>Aprendendo com DJ Stay</title>")) {
      failures.push(`${route.pathname}: título operacional ausente no DOM renderizado.`);
    }
    if (!dom.includes('id="root"')) {
      failures.push(`${route.pathname}: elemento #root ausente.`);
    }
    if (/<div\s+id="root"\s*>\s*<\/div>/i.test(dom)) {
      failures.push(`${route.pathname}: React não hidratou o elemento #root.`);
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
  } finally {
    rmSync(profileDirectory, { recursive: true, force: true });
  }
};

try {
  await waitForPreview();
  for (const route of routes) runRoute(route);
} catch (error) {
  failures.push(
    `Execução do navegador falhou: ${error instanceof Error ? error.message : String(error)}`,
  );
} finally {
  await stopPreview();
}

if (failures.length > 0) {
  console.error("Smoke B118 inválido:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(
  `Smoke B118 aprovado em ${browserExecutable}: home, login e certificado executaram o JavaScript compilado e renderizaram sem Error Boundary.`,
);

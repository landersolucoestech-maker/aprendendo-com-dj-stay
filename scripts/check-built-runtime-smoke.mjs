import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createServer } from "node:net";
import path from "node:path";

const root = process.cwd();
const paths = {
  index: path.join(root, "dist", "index.html"),
  release: path.join(root, "dist", "release.json"),
  favicon: path.join(root, "dist", "favicon.ico"),
  vite: path.join(root, "node_modules", "vite", "bin", "vite.js"),
  parent: path.join(root, "scripts", "check-release-artifact.mjs"),
  documentation: path.join(
    root,
    "docs",
    "refactor",
    "FASE-B115-BUILT-RUNTIME-SMOKE.md",
  ),
};

const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};
const delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

for (const [name, filePath] of Object.entries(paths)) {
  expect(existsSync(filePath), `Arquivo B115 ausente (${name}): ${filePath}`);
}

const parent = existsSync(paths.parent) ? await readFile(paths.parent, "utf8") : "";
const documentation = existsSync(paths.documentation)
  ? await readFile(paths.documentation, "utf8")
  : "";

expect(
  parent.includes('await import("./check-built-runtime-smoke.mjs")'),
  "Smoke B115 deve permanecer encadeado ao gate do artefato de release.",
);
for (const fragment of [
  "FASE B115",
  "`vite preview`",
  "`/aluno/cursos`",
  "`/release.json`",
  "`SIGTERM`",
  "Nenhuma migration",
  "Supabase remoto não foi modificado",
  "branch `main` não foi alterada",
  "não equivale a homologação externa",
]) {
  expect(documentation.includes(fragment), `Documentação B115 ausente: ${fragment}`);
}

if (failures.length > 0) {
  console.error("Contrato B115 inválido:\n- " + failures.join("\n- "));
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
const host = "127.0.0.1";
const baseUrl = `http://${host}:${port}`;
const previewLogs = [];
let previewExited = false;
let previewSpawnError = null;

const preview = spawn(
  process.execPath,
  [
    paths.vite,
    "preview",
    "--host",
    host,
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

const fetchLocal = (pathname) =>
  fetch(`${baseUrl}${pathname}`, {
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
      const response = await fetchLocal("/");
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

try {
  await waitForPreview();

  const rootResponse = await fetchLocal("/");
  expect(rootResponse.status === 200, `GET / retornou HTTP ${rootResponse.status}.`);
  expect(
    rootResponse.headers.get("content-type")?.includes("text/html") === true,
    "GET / deve retornar text/html.",
  );
  const rootHtml = await rootResponse.text();
  expect(rootHtml.includes('<div id="root"></div>'), "HTML servido não possui #root.");

  for (const forbidden of ["lovable", "gpteng", "gptengineer", "cdn.gpteng.co"]) {
    expect(
      !rootHtml.toLocaleLowerCase("pt-BR").includes(forbidden),
      `HTML compilado contém artefato externo proibido: ${forbidden}`,
    );
  }

  const fallbackResponse = await fetchLocal("/aluno/cursos");
  expect(
    fallbackResponse.status === 200,
    `Fallback SPA /aluno/cursos retornou HTTP ${fallbackResponse.status}.`,
  );
  expect(
    fallbackResponse.headers.get("content-type")?.includes("text/html") === true,
    "Fallback SPA deve retornar text/html.",
  );
  const fallbackHtml = await fallbackResponse.text();
  expect(
    fallbackHtml === rootHtml,
    "Fallback SPA deve servir o mesmo documento compilado da raiz.",
  );

  const releaseResponse = await fetchLocal("/release.json");
  expect(
    releaseResponse.status === 200,
    `GET /release.json retornou HTTP ${releaseResponse.status}.`,
  );
  expect(
    releaseResponse.headers.get("content-type")?.includes("application/json") === true,
    "GET /release.json deve retornar application/json.",
  );
  const servedRelease = await releaseResponse.json();
  const compiledRelease = JSON.parse(await readFile(paths.release, "utf8"));
  expect(
    JSON.stringify(servedRelease) === JSON.stringify(compiledRelease),
    "Manifesto de release servido diverge de dist/release.json.",
  );

  const localReferences = [
    ...rootHtml.matchAll(/(?:src|href)="(\/[^"?#]+)(?:[?#][^"]*)?"/gi),
  ].map((match) => match[1]);
  const assets = [...new Set(localReferences)].filter(
    (reference) => reference === "/favicon.ico" || reference.startsWith("/assets/"),
  );

  expect(assets.includes("/favicon.ico"), "HTML compilado não referencia /favicon.ico.");
  expect(assets.some((asset) => asset.endsWith(".js")), "Nenhum asset JavaScript foi referenciado.");
  expect(assets.some((asset) => asset.endsWith(".css")), "Nenhum asset CSS foi referenciado.");

  for (const asset of assets) {
    const response = await fetchLocal(asset);
    expect(response.status === 200, `GET ${asset} retornou HTTP ${response.status}.`);
    const contentType = response.headers.get("content-type") ?? "";
    if (asset.endsWith(".js")) {
      expect(contentType.includes("javascript"), `${asset} possui MIME inválido: ${contentType}.`);
    } else if (asset.endsWith(".css")) {
      expect(contentType.includes("text/css"), `${asset} possui MIME inválido: ${contentType}.`);
    } else if (asset.endsWith(".ico")) {
      expect(contentType.startsWith("image/"), `${asset} possui MIME inválido: ${contentType}.`);
    }

    const body = await response.arrayBuffer();
    expect(body.byteLength > 0, `${asset} foi servido vazio.`);
  }
} catch (error) {
  failures.push(
    `Smoke HTTP falhou: ${error instanceof Error ? error.message : String(error)}`,
  );
} finally {
  await stopPreview();
}

if (failures.length > 0) {
  console.error("Contrato B115 inválido:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(
  `Contrato B115 aprovado: preview HTTP ${baseUrl} serviu raiz, fallback SPA, release e assets locais com respostas válidas.`,
);

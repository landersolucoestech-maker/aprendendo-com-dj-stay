import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

const root = process.cwd();
const artifactsDirectory = path.join(root, "artifacts", "browser-smoke");
const expectedRoutes = [
  "home",
  "login",
  "certificate",
  "contact",
  "register",
  "forgot-password",
  "access-denied",
  "not-found",
];
const failures = [];
const outOfOriginRequests = [];
const routeOrigins = [];

if (!existsSync(artifactsDirectory)) {
  failures.push(`Diretório B128 ausente: ${artifactsDirectory}`);
  mkdirSync(artifactsDirectory, { recursive: true });
} else {
  const networkFiles = readdirSync(artifactsDirectory)
    .filter((file) => file.endsWith(".network.json"))
    .sort();
  const expectedFiles = expectedRoutes.map((route) => `${route}.network.json`).sort();

  if (JSON.stringify(networkFiles) !== JSON.stringify(expectedFiles)) {
    failures.push(
      `Matriz de rede B128 divergente. Esperado ${expectedFiles.join(", ")}; recebido ${networkFiles.join(", ") || "nenhum arquivo"}.`,
    );
  }

  for (const file of networkFiles) {
    const filePath = path.join(artifactsDirectory, file);
    const route = file.replace(/\.network\.json$/, "");
    let entries;

    try {
      entries = JSON.parse(readFileSync(filePath, "utf8"));
    } catch (error) {
      failures.push(
        `${file}: artefato de rede inválido: ${error instanceof Error ? error.message : String(error)}`,
      );
      continue;
    }

    if (!Array.isArray(entries)) {
      failures.push(`${file}: artefato de rede deve ser uma lista.`);
      continue;
    }

    const requests = entries.filter(
      (entry) =>
        entry !== null &&
        typeof entry === "object" &&
        entry.kind === "request" &&
        typeof entry.url === "string",
    );
    const documentRequests = requests.filter(
      (entry) => entry.resourceType === "Document",
    );

    if (documentRequests.length !== 1) {
      failures.push(
        `${file}: esperado exatamente um documento principal, recebido ${documentRequests.length}.`,
      );
      continue;
    }

    let documentUrl;
    try {
      documentUrl = new URL(documentRequests[0].url);
    } catch {
      failures.push(
        `${file}: URL do documento principal inválida: ${documentRequests[0].url}`,
      );
      continue;
    }

    const documentIsLoopback =
      documentUrl.hostname === "127.0.0.1" ||
      documentUrl.hostname === "localhost" ||
      documentUrl.hostname === "[::1]";
    if (
      (documentUrl.protocol !== "http:" && documentUrl.protocol !== "https:") ||
      !documentIsLoopback
    ) {
      failures.push(
        `${file}: documento principal não usa a origem loopback esperada: ${documentUrl.href}`,
      );
      continue;
    }

    routeOrigins.push({ route, origin: documentUrl.origin });

    for (const entry of requests) {
      let requestUrl;
      try {
        requestUrl = new URL(entry.url);
      } catch {
        failures.push(`${file}: URL de requisição inválida: ${entry.url}`);
        continue;
      }

      if (requestUrl.protocol !== "http:" && requestUrl.protocol !== "https:") {
        continue;
      }

      if (requestUrl.origin !== documentUrl.origin) {
        outOfOriginRequests.push({
          route,
          allowedOrigin: documentUrl.origin,
          method: typeof entry.method === "string" ? entry.method : "GET",
          url: requestUrl.href,
        });
      }
    }
  }
}

writeFileSync(
  path.join(artifactsDirectory, "external-network-summary.json"),
  `${JSON.stringify(
    {
      checkedRoutes: expectedRoutes,
      routeOrigins,
      outOfOriginRequestCount: outOfOriginRequests.length,
      outOfOriginRequests,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

for (const request of outOfOriginRequests) {
  failures.push(
    `${request.route}: origem HTTP diferente do documento servido: ${request.method} ${request.url}; permitida ${request.allowedOrigin}`,
  );
}

if (failures.length > 0) {
  console.error("Isolamento de rede B128 inválido:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(
  "Isolamento de rede B128 aprovado: oito rotas usaram exclusivamente a origem e a porta do próprio documento servido.",
);

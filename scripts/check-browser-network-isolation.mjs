import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
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
const externalRequests = [];

if (!existsSync(artifactsDirectory)) {
  failures.push(`Diretório B128 ausente: ${artifactsDirectory}`);
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

    for (const entry of entries) {
      if (
        entry === null ||
        typeof entry !== "object" ||
        entry.kind !== "request" ||
        typeof entry.url !== "string"
      ) {
        continue;
      }

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

      const isLoopback =
        requestUrl.hostname === "127.0.0.1" ||
        requestUrl.hostname === "localhost" ||
        requestUrl.hostname === "[::1]";

      if (!isLoopback) {
        externalRequests.push({
          route: file.replace(/\.network\.json$/, ""),
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
      externalRequestCount: externalRequests.length,
      externalRequests,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

for (const request of externalRequests) {
  failures.push(
    `${request.route}: origem HTTP externa proibida: ${request.method} ${request.url}`,
  );
}

if (failures.length > 0) {
  console.error("Isolamento de rede B128 inválido:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(
  "Isolamento de rede B128 aprovado: oito rotas usaram somente a origem loopback do artefato servido.",
);

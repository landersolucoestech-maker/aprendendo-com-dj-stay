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
const routeExpectations = [
  { name: "home", pathname: "/" },
  { name: "login", pathname: "/login" },
  { name: "certificate", pathname: "/certificado" },
  { name: "contact", pathname: "/contato" },
  { name: "register", pathname: "/matricule-se" },
  { name: "forgot-password", pathname: "/esqueceu-senha" },
  { name: "access-denied", pathname: "/acesso-negado" },
  { name: "not-found", pathname: "/rota-inexistente-b122" },
];
const clientNavigationFile = "client-navigation.network.json";
const failures = [];
const outOfOriginRequests = [];
const failedResponses = [];
const checkedArtifacts = [];

const parseEntries = (file) => {
  const filePath = path.join(artifactsDirectory, file);
  try {
    const entries = JSON.parse(readFileSync(filePath, "utf8"));
    if (!Array.isArray(entries)) {
      failures.push(`${file}: artefato de rede deve ser uma lista.`);
      return null;
    }
    return entries;
  } catch (error) {
    failures.push(
      `${file}: artefato de rede inválido: ${error instanceof Error ? error.message : String(error)}`,
    );
    return null;
  }
};

const toHttpUrl = (value, file) => {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url;
  } catch {
    failures.push(`${file}: URL de rede inválida: ${String(value)}`);
    return null;
  }
};

const validateLoopbackDocument = (file, documentRequest, expectedPathname) => {
  const documentUrl = toHttpUrl(documentRequest.url, file);
  if (documentUrl === null) return null;

  const documentIsLoopback =
    documentUrl.hostname === "127.0.0.1" ||
    documentUrl.hostname === "localhost" ||
    documentUrl.hostname === "[::1]";
  if (!documentIsLoopback) {
    failures.push(
      `${file}: documento principal não usa origem loopback: ${documentUrl.href}`,
    );
  }
  if (documentUrl.pathname !== expectedPathname) {
    failures.push(
      `${file}: documento principal deveria usar ${expectedPathname}, mas usou ${documentUrl.pathname}.`,
    );
  }
  if (!documentUrl.port) {
    failures.push(`${file}: documento principal não expõe a porta efêmera.`);
  }
  return documentUrl;
};

const validateEntriesAgainstOrigin = (file, label, entries, documentUrl) => {
  const requests = entries.filter(
    (entry) =>
      entry !== null &&
      typeof entry === "object" &&
      entry.kind === "request" &&
      typeof entry.url === "string",
  );
  const responses = entries.filter(
    (entry) =>
      entry !== null &&
      typeof entry === "object" &&
      entry.kind === "response" &&
      typeof entry.url === "string",
  );

  for (const entry of requests) {
    const requestUrl = toHttpUrl(entry.url, file);
    if (requestUrl === null) continue;
    if (requestUrl.origin !== documentUrl.origin) {
      outOfOriginRequests.push({
        artifact: label,
        allowedOrigin: documentUrl.origin,
        method: typeof entry.method === "string" ? entry.method : "GET",
        url: requestUrl.href,
      });
    }
  }

  for (const entry of responses) {
    if (Number(entry.status) >= 400) {
      failedResponses.push({
        artifact: label,
        status: Number(entry.status),
        url: entry.url,
      });
    }
  }

  return { requests, responses };
};

if (!existsSync(artifactsDirectory)) {
  failures.push(`Diretório B128/B132 ausente: ${artifactsDirectory}`);
  mkdirSync(artifactsDirectory, { recursive: true });
} else {
  const networkFiles = readdirSync(artifactsDirectory)
    .filter((file) => file.endsWith(".network.json"))
    .sort();
  const expectedFiles = [
    ...routeExpectations.map((route) => `${route.name}.network.json`),
    clientNavigationFile,
  ].sort();

  if (JSON.stringify(networkFiles) !== JSON.stringify(expectedFiles)) {
    failures.push(
      `Matriz de rede B128/B132 divergente. Esperado ${expectedFiles.join(", ")}; recebido ${networkFiles.join(", ") || "nenhum arquivo"}.`,
    );
  }

  for (const route of routeExpectations) {
    const file = `${route.name}.network.json`;
    if (!networkFiles.includes(file)) continue;
    const entries = parseEntries(file);
    if (entries === null) continue;

    const documentRequests = entries.filter(
      (entry) =>
        entry !== null &&
        typeof entry === "object" &&
        entry.kind === "request" &&
        entry.resourceType === "Document" &&
        typeof entry.url === "string",
    );
    if (documentRequests.length !== 1) {
      failures.push(
        `${file}: esperado exatamente um documento principal, recebido ${documentRequests.length}.`,
      );
      continue;
    }

    const documentUrl = validateLoopbackDocument(
      file,
      documentRequests[0],
      route.pathname,
    );
    if (documentUrl === null) continue;
    const counts = validateEntriesAgainstOrigin(
      file,
      route.name,
      entries,
      documentUrl,
    );
    checkedArtifacts.push({
      artifact: route.name,
      kind: "route",
      origin: documentUrl.origin,
      documentPathname: documentUrl.pathname,
      requestCount: counts.requests.length,
      responseCount: counts.responses.length,
    });
  }

  if (networkFiles.includes(clientNavigationFile)) {
    const entries = parseEntries(clientNavigationFile);
    if (entries !== null) {
      const documentRequests = entries.filter(
        (entry) =>
          entry !== null &&
          typeof entry === "object" &&
          entry.kind === "request" &&
          entry.resourceType === "Document" &&
          typeof entry.url === "string",
      );
      if (documentRequests.length !== 1) {
        failures.push(
          `${clientNavigationFile}: esperado um único documento inicial; a transição client-side não pode criar outro Document. Recebido ${documentRequests.length}.`,
        );
      } else {
        const documentUrl = validateLoopbackDocument(
          clientNavigationFile,
          documentRequests[0],
          "/",
        );
        if (documentUrl !== null) {
          const counts = validateEntriesAgainstOrigin(
            clientNavigationFile,
            "client-navigation",
            entries,
            documentUrl,
          );
          const navigationPhaseMarkers = entries.filter(
            (entry) =>
              entry !== null &&
              typeof entry === "object" &&
              entry.kind === "phase" &&
              entry.phase === "client-navigation" &&
              entry.pathname === "/login",
          );
          const navigationDocumentRequests = documentRequests.filter(
            (entry) => entry.phase === "client-navigation",
          );

          if (navigationPhaseMarkers.length !== 1) {
            failures.push(
              `${clientNavigationFile}: esperado exatamente um marcador da transição client-side para /login.`,
            );
          }
          if (navigationDocumentRequests.length !== 0) {
            failures.push(
              `${clientNavigationFile}: /login gerou documento completo; esperado roteamento client-side sem novo Document.`,
            );
          }

          checkedArtifacts.push({
            artifact: "client-navigation",
            kind: "client-navigation",
            origin: documentUrl.origin,
            documentPathname: documentUrl.pathname,
            destinationPathname: "/login",
            documentRequestCount: documentRequests.length,
            navigationDocumentRequestCount: navigationDocumentRequests.length,
            requestCount: counts.requests.length,
            responseCount: counts.responses.length,
          });
        }
      }
    }
  }
}

for (const request of outOfOriginRequests) {
  failures.push(
    `${request.artifact}: origem HTTP diferente do documento servido: ${request.method} ${request.url}; permitida ${request.allowedOrigin}`,
  );
}
for (const response of failedResponses) {
  failures.push(
    `${response.artifact}: resposta HTTP inesperada ${response.status} em ${response.url}`,
  );
}

writeFileSync(
  path.join(artifactsDirectory, "external-network-summary.json"),
  `${JSON.stringify(
    {
      expectedRouteCount: routeExpectations.length,
      expectedArtifactCount: routeExpectations.length + 1,
      checkedArtifacts,
      outOfOriginRequestCount: outOfOriginRequests.length,
      outOfOriginRequests,
      failedResponseCount: failedResponses.length,
      failedResponses,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

if (failures.length > 0) {
  console.error(
    "Isolamento de rede B128/B132 inválido:\n- " + failures.join("\n- "),
  );
  process.exit(1);
}

console.log(
  "Isolamento de rede B128/B132 aprovado: oito rotas e a navegação client-side home→login usaram somente a origem e a porta do documento inicial, sem novo Document ou HTTP >= 400.",
);

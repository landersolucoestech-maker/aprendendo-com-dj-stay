import { existsSync, readFileSync } from "node:fs";

const paths = {
  stylesheet: "src/index.css",
  tailwind: "tailwind.config.ts",
  runtimeCheck: "scripts/check-browser-network-isolation.mjs",
  workflow: ".github/workflows/baseline.yml",
  documentation: "docs/refactor/FASE-B128-PUBLIC-RUNTIME-NETWORK-ISOLATION.md",
  parent: "scripts/check-ci-determinism.mjs",
};

const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};
const read = (path) => (existsSync(path) ? readFileSync(path, "utf8") : "");

for (const path of Object.values(paths)) {
  expect(existsSync(path), `Arquivo B128 ausente: ${path}`);
}

const stylesheet = read(paths.stylesheet);
const tailwind = read(paths.tailwind);
const runtimeCheck = read(paths.runtimeCheck);
const workflow = read(paths.workflow);
const documentation = read(paths.documentation);
const parent = read(paths.parent);

for (const forbidden of [
  "fonts.googleapis.com",
  "fonts.gstatic.com",
  "@import url(",
]) {
  expect(
    !stylesheet.includes(forbidden),
    `Stylesheet B128 preserva dependência externa proibida: ${forbidden}`,
  );
}

for (const forbidden of ["fonts.googleapis.com", "fonts.gstatic.com", '"Inter"']) {
  expect(
    !tailwind.includes(forbidden),
    `Tailwind B128 preserva fonte remota ou não contratada: ${forbidden}`,
  );
}

for (const fragment of [
  '"ui-sans-serif"',
  '"system-ui"',
  '"-apple-system"',
  '"BlinkMacSystemFont"',
  '"Segoe UI"',
  '"sans-serif"',
]) {
  expect(tailwind.includes(fragment), `Stack nativa B128 ausente: ${fragment}`);
}

for (const fragment of [
  '"home"',
  '"login"',
  '"certificate"',
  '"contact"',
  '"register"',
  '"forgot-password"',
  '"access-denied"',
  '"not-found"',
  'file.endsWith(".network.json")',
  'entry.resourceType === "Document"',
  "documentRequests.length !== 1",
  'documentUrl.hostname === "127.0.0.1"',
  'documentUrl.hostname === "localhost"',
  'documentUrl.hostname === "[::1]"',
  'requestUrl.protocol !== "http:"',
  'requestUrl.protocol !== "https:"',
  "requestUrl.origin !== documentUrl.origin",
  '"external-network-summary.json"',
  "routeOrigins",
  "outOfOriginRequestCount",
  "origem HTTP diferente do documento servido",
]) {
  expect(runtimeCheck.includes(fragment), `Verificador B128 ausente: ${fragment}`);
}

expect(
  /run-browser-runtime-smoke\.mjs[\s\S]*?check-browser-network-isolation\.mjs[\s\S]*?run-browser-client-navigation-smoke\.mjs/.test(
    workflow,
  ),
  "Workflow B128 deve verificar a rede entre o smoke de rotas e a navegação client-side.",
);

for (const fragment of [
  "FASE B128",
  "duas requisições externas em cada uma das oito rotas",
  "`fonts.googleapis.com`",
  "`fonts.gstatic.com`",
  "stack nativa",
  "exatamente uma requisição principal do tipo `Document`",
  "origem completa, incluindo a porta efêmera",
  "mesma origem do documento principal",
  "`external-network-summary.json`",
  "fora da origem e porta exatas do documento servido",
  "Nenhum arquivo de fonte foi versionado",
  "Supabase remoto não foi modificado",
  "Nenhuma dependência ou lockfile foi alterado",
]) {
  expect(documentation.includes(fragment), `Documentação B128 ausente: ${fragment}`);
}

expect(
  parent.includes('await import("./check-public-runtime-network-isolation.mjs")'),
  "Contrato B128 deve permanecer encadeado ao gate de determinismo do CI.",
);

if (failures.length > 0) {
  console.error("Contrato B128 inválido:\n- " + [...new Set(failures)].join("\n- "));
  process.exit(1);
}

console.log(
  "Contrato B128 aprovado: o shell usa stack tipográfica nativa e as oito rotas públicas ficam restritas à origem e porta do documento servido.",
);

import { existsSync, readFileSync } from "node:fs";

const paths = {
  stylesheet: "src/index.css",
  tailwind: "tailwind.config.ts",
  routeRuntime: "scripts/run-browser-runtime-smoke.mjs",
  navigationRuntime: "scripts/run-browser-client-navigation-smoke.mjs",
  runtimeCheck: "scripts/check-browser-network-isolation.mjs",
  workflow: ".github/workflows/baseline.yml",
  documentation: "docs/refactor/FASE-B128-PUBLIC-RUNTIME-NETWORK-ISOLATION.md",
  navigationDocumentation:
    "docs/refactor/FASE-B132-CLIENT-NAVIGATION-NETWORK-ISOLATION.md",
  cleanupDocumentation:
    "docs/refactor/FASE-B133-RUNTIME-PROFILE-CLEANUP.md",
  parent: "scripts/check-ci-determinism.mjs",
};

const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};
const read = (path) => (existsSync(path) ? readFileSync(path, "utf8") : "");

for (const path of Object.values(paths)) {
  expect(existsSync(path), `Arquivo B128/B132/B133 ausente: ${path}`);
}

const stylesheet = read(paths.stylesheet);
const tailwind = read(paths.tailwind);
const routeRuntime = read(paths.routeRuntime);
const navigationRuntime = read(paths.navigationRuntime);
const runtimeCheck = read(paths.runtimeCheck);
const workflow = read(paths.workflow);
const documentation = read(paths.documentation);
const navigationDocumentation = read(paths.navigationDocumentation);
const cleanupDocumentation = read(paths.cleanupDocumentation);
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
  'packet.method === "Network.requestWillBeSent"',
  'packet.method === "Network.responseReceived"',
  '`${route.name}.network.json`',
  "const removeBrowserProfileDirectory = async () =>",
  "attempt < 6",
  'code === "ENOTEMPTY"',
  'code === "EBUSY"',
  'code === "EPERM"',
  "await delay(200 * (attempt + 1))",
  "await removeBrowserProfileDirectory()",
  "Limpeza do perfil temporário do Chrome falhou",
  "Smoke B118/B122/B123/B127/B133 inválido",
]) {
  expect(
    routeRuntime.includes(fragment),
    `Smoke de rotas B128/B133 ausente: ${fragment}`,
  );
}

expect(
  !routeRuntime.includes(
    "rmSync(browserProfileDirectory, { recursive: true, force: true });\n}",
  ),
  "Smoke B133 não pode encerrar com remoção única e não tratada do perfil.",
);

for (const fragment of [
  "const networkRecords = []",
  'let networkPhase = "initial-document"',
  'packet.method === "Network.requestWillBeSent"',
  'packet.method === "Network.responseReceived"',
  'networkPhase = "client-navigation"',
  'kind: "phase"',
  'pathname: "/login"',
  '"client-navigation.network.json"',
  'entry.kind === "response" && Number(entry.status) >= 400',
  'code === "ENOTEMPTY"',
  'code === "EBUSY"',
  'code === "EPERM"',
]) {
  expect(
    navigationRuntime.includes(fragment),
    `Smoke de navegação B132 ausente: ${fragment}`,
  );
}

for (const fragment of [
  '{ name: "home", pathname: "/" }',
  '{ name: "login", pathname: "/login" }',
  '{ name: "certificate", pathname: "/certificado" }',
  '{ name: "contact", pathname: "/contato" }',
  '{ name: "register", pathname: "/matricule-se" }',
  '{ name: "forgot-password", pathname: "/esqueceu-senha" }',
  '{ name: "access-denied", pathname: "/acesso-negado" }',
  '{ name: "not-found", pathname: "/rota-inexistente-b122" }',
  'const clientNavigationFile = "client-navigation.network.json"',
  'file.endsWith(".network.json")',
  'entry.resourceType === "Document"',
  "documentRequests.length !== 1",
  'documentUrl.hostname === "127.0.0.1"',
  'documentUrl.hostname === "localhost"',
  'documentUrl.hostname === "[::1]"',
  "requestUrl.origin !== documentUrl.origin",
  'entry.kind === "phase"',
  'entry.phase === "client-navigation"',
  'entry.pathname === "/login"',
  "navigationDocumentRequests.length !== 0",
  "expectedArtifactCount: routeExpectations.length + 1",
  '"external-network-summary.json"',
  "outOfOriginRequestCount",
  "failedResponseCount",
  "origem HTTP diferente do documento servido",
  "resposta HTTP inesperada",
]) {
  expect(
    runtimeCheck.includes(fragment),
    `Verificador B128/B132 ausente: ${fragment}`,
  );
}

expect(
  /run-browser-runtime-smoke\.mjs[\s\S]*?run-browser-client-navigation-smoke\.mjs[\s\S]*?check-browser-network-isolation\.mjs/.test(
    workflow,
  ),
  "Workflow B132 deve gerar as nove evidências antes da verificação consolidada de rede.",
);

for (const forbidden of [
  "run_runtime_smoke()",
  "Retry B131",
  "grep -Fq",
  "rm -rf /tmp/djstay-browser-profile-*",
  "tee -a artifacts/diagnostics/browser-runtime.log",
]) {
  expect(
    !workflow.includes(forbidden),
    `Workflow B133 preserva contorno proibido: ${forbidden}`,
  );
}

for (const fragment of [
  "set -o pipefail",
  "node scripts/run-browser-runtime-smoke.mjs 2>&1 | tee artifacts/diagnostics/browser-runtime.log",
  "node scripts/run-browser-client-navigation-smoke.mjs 2>&1 | tee artifacts/diagnostics/browser-navigation.log",
  "node scripts/check-browser-network-isolation.mjs 2>&1 | tee artifacts/diagnostics/browser-network.log",
]) {
  expect(workflow.includes(fragment), `Workflow B133 ausente: ${fragment}`);
}

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

for (const fragment of [
  "FASE B132",
  "não persistia os eventos `Network.requestWillBeSent` e `Network.responseReceived`",
  "`client-navigation.network.json`",
  "exatamente nove artefatos de rede",
  "nenhuma requisição `Document` durante a fase `client-navigation`",
  "mesma origem e porta do documento inicial",
  "nenhuma resposta HTTP com status maior ou igual a 400",
  "Supabase remoto não foi modificado",
  "Nenhuma dependência ou lockfile foi alterado",
  "Nenhuma exceção de rede foi adicionada",
]) {
  expect(
    navigationDocumentation.includes(fragment),
    `Documentação B132 ausente: ${fragment}`,
  );
}

for (const fragment of [
  "FASE B133",
  "produzindo `ENOTEMPTY`",
  "repetia navegação, coleta de artefatos e validações já concluídas",
  "repete a remoção no máximo seis vezes",
  "somente para `ENOTEMPTY`, `EBUSY` e `EPERM`",
  "não possui mais a função `run_runtime_smoke`",
  "não repete rotas",
  "nunca dispara repetição",
  "nenhum diretório temporário de outra execução é removido por glob",
  "Supabase remoto não foi modificado",
  "nenhuma migration, dependência ou lockfile foi alterado",
]) {
  expect(
    cleanupDocumentation.includes(fragment),
    `Documentação B133 ausente: ${fragment}`,
  );
}

expect(
  parent.includes('await import("./check-public-runtime-network-isolation.mjs")'),
  "Contrato B128/B132/B133 deve permanecer encadeado ao gate de determinismo do CI.",
);

if (failures.length > 0) {
  console.error(
    "Contrato B128/B132/B133 inválido:\n- " +
      [...new Set(failures)].join("\n- "),
  );
  process.exit(1);
}

console.log(
  "Contrato B128/B132/B133 aprovado: rede pública isolada e limpeza dos perfis temporários tratada na causa sem repetição do smoke pelo workflow.",
);

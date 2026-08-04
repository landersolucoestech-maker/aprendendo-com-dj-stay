import { existsSync, readFileSync } from "node:fs";

const paths = {
  config: "src/config/public-config.ts",
  hook: "src/hooks/usePublicCourseCatalog.ts",
  loader: "src/runtime/load-public-course-catalog.ts",
  fixture: "src/runtime/ci-runtime-smoke-catalog.ts",
  tests: "src/runtime/ci-runtime-smoke-catalog.test.ts",
  browser: "scripts/run-browser-runtime-smoke.mjs",
  environment: "docs/environment.md",
  documentation: "docs/refactor/FASE-B127-CI-RUNTIME-CATALOG-ISOLATION.md",
  parent: "scripts/check-ci-determinism.mjs",
};

const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};
const read = (path) => (existsSync(path) ? readFileSync(path, "utf8") : "");

for (const path of Object.values(paths)) {
  expect(existsSync(path), `Arquivo B127 ausente: ${path}`);
}

const config = read(paths.config);
const hook = read(paths.hook);
const loader = read(paths.loader);
const fixture = read(paths.fixture);
const tests = read(paths.tests);
const browser = read(paths.browser);
const environment = read(paths.environment);
const documentation = read(paths.documentation);
const parent = read(paths.parent);

for (const fragment of [
  "export const ciRuntimeSmokeEnabled =",
  "publicConfig.supabasePublishableKey === CI_RUNTIME_SMOKE_PUBLISHABLE_KEY",
]) {
  expect(config.includes(fragment), `Configuração B127 ausente: ${fragment}`);
}
expect(
  !config.includes("readonly ciRuntimeSmoke: boolean"),
  "B127 deve preservar o shape público anterior e derivar o modo sintético do marcador validado.",
);

for (const fragment of [
  "ciRuntimeSmokeEnabled",
  "executePublicCourseCatalogRpc",
  'supabase.rpc("get_public_course_catalog")',
  "loadPublicCourseCatalog(",
]) {
  expect(hook.includes(fragment), `Hook B127 ausente: ${fragment}`);
}

for (const fragment of [
  "export const loadPublicCourseCatalog = async",
  "runtimeSmokeEnabled: boolean",
  "executeRpc: CatalogRpc",
  "if (runtimeSmokeEnabled)",
  "ciRuntimeSmokeCatalog",
  '"catálogo sintético do smoke de runtime"',
  "const { data, error } = await executeRpc()",
  '"catálogo público de cursos"',
]) {
  expect(loader.includes(fragment), `Loader B127 ausente: ${fragment}`);
}
expect(
  /if \(runtimeSmokeEnabled\) \{[\s\S]*?return parseDataContract\([\s\S]*?ciRuntimeSmokeCatalog[\s\S]*?\);[\s\S]*?\}[\s\S]*?const \{ data, error \} = await executeRpc\(\)/s.test(
    loader,
  ),
  "B127 deve retornar a fixture antes de executar a RPC.",
);

for (const fragment of [
  'ciRuntimeSmokeCourseTitle = "Curso de validação do runtime"',
  'slug: "curso-validacao-runtime"',
  'published_at: "2026-08-04T00:00:00.000Z"',
  "module_count: 1",
  "lesson_count: 2",
  "duration_minutes: 90",
  "preview_lesson_count: 1",
  "satisfies PublicCourseCatalog",
]) {
  expect(fixture.includes(fragment), `Fixture B127 ausente: ${fragment}`);
}

for (const fragment of [
  'describe("ci runtime smoke catalog"',
  'it("não invoca a RPC no modo sintético"',
  "loadPublicCourseCatalog(true, executeRpc)",
  "expect(executeRpc).not.toHaveBeenCalled()",
  'it("mantém a RPC real fora do modo sintético"',
  "loadPublicCourseCatalog(false, executeRpc)",
  "expect(executeRpc).toHaveBeenCalledTimes(1)",
]) {
  expect(tests.includes(fragment), `Teste B127 ausente: ${fragment}`);
}

for (const fragment of [
  '"Network.enable"',
  'packet.method === "Network.requestWillBeSent"',
  'packet.method === "Network.responseReceived"',
  '`${route.name}.network.json`',
  '"Curso de validação do runtime"',
  '"Investimento atual"',
  '"Carregando catálogo"',
  '"Carregando conteúdo publicado"',
  '"Catálogo temporariamente indisponível"',
  'hostname.endsWith(".supabase.co")',
  "Number(entry.status) >= 400",
  "build sintético realizou chamada proibida ao Supabase",
  "resposta HTTP inesperada",
]) {
  expect(browser.includes(fragment), `Chrome B127 ausente: ${fragment}`);
}
expect(
  /name: "home"[\s\S]*?required: \[[\s\S]*?"Curso de validação do runtime"[\s\S]*?"Investimento atual"[\s\S]*?\]/s.test(
    browser,
  ),
  "A home B127 deve aguardar o catálogo sintético final.",
);

for (const fragment of [
  "fixture canônica em memória",
  "mesmo schema Zod",
  "nenhuma chamada ao Supabase remoto",
  "artefato de rede por rota",
  "`*.supabase.co`",
  "status igual ou superior a 400",
]) {
  expect(environment.includes(fragment), `Contrato ambiental B127 ausente: ${fragment}`);
}

for (const fragment of [
  "FASE B127",
  "resposta HTTP `401`",
  "não representa oferta comercial persistida",
  "RPC receba zero chamadas no modo sintético",
  "`Curso de validação do runtime`",
  "`<rota>.network.json`",
  "qualquer requisição aponta para `*.supabase.co`",
  "Nenhuma migration",
  "Supabase remoto não foi modificado",
  "Nenhuma chave ativa foi versionada",
  "Nenhuma dependência ou lockfile foi alterado",
]) {
  expect(documentation.includes(fragment), `Documentação B127 ausente: ${fragment}`);
}

expect(
  parent.includes('await import("./check-ci-runtime-catalog-isolation.mjs")'),
  "Contrato B127 deve permanecer encadeado ao gate de determinismo do CI.",
);

if (failures.length > 0) {
  console.error("Contrato B127 inválido:\n- " + [...new Set(failures)].join("\n- "));
  process.exit(1);
}

console.log(
  "Contrato B127 aprovado: o catálogo sintético é validado em memória, não invoca a RPC e o Chrome bloqueia rede Supabase ou respostas HTTP falhas.",
);

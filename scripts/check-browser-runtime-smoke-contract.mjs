import { existsSync, readFileSync } from "node:fs";

const paths = {
  runtime: "scripts/run-browser-runtime-smoke.mjs",
  workflow: ".github/workflows/baseline.yml",
  parent: "scripts/check-ci-determinism.mjs",
  documentation: "docs/refactor/FASE-B118-HEADLESS-BROWSER-SMOKE.md",
};

const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};
const read = (path) => (existsSync(path) ? readFileSync(path, "utf8") : "");

for (const path of Object.values(paths)) {
  expect(existsSync(path), `Arquivo B118 ausente: ${path}`);
}

const runtime = read(paths.runtime);
const workflow = read(paths.workflow);
const parent = read(paths.parent);
const documentation = read(paths.documentation);

for (const fragment of [
  'path.join(root, "artifacts", "browser-smoke")',
  'process.env.BROWSER_EXECUTABLE',
  '"/usr/bin/google-chrome"',
  '"/usr/bin/chromium"',
  '"--headless=new"',
  '"--no-sandbox"',
  '"--disable-dev-shm-usage"',
  '"--virtual-time-budget=10000"',
  '"--dump-dom"',
  'pathname: "/"',
  'pathname: "/login"',
  'pathname: "/certificado"',
  '"Conteúdo publicado pelo instrutor"',
  '"Acesse sua conta para continuar aprendendo."',
  '"Validar certificado"',
  '"Esta página não pôde ser carregada"',
  '/<div\\s+id="root"\\s*>\\s*<\\/div>/i',
  'rmSync(profileDirectory, { recursive: true, force: true })',
  'await stopPreview();',
]) {
  expect(runtime.includes(fragment), `Runtime B118 perdeu a garantia: ${fragment}`);
}

for (const forbidden of [
  "playwright",
  "puppeteer",
  "selenium",
  "webdriver",
  "https://",
]) {
  expect(
    !runtime.toLocaleLowerCase("pt-BR").includes(forbidden),
    `Runtime B118 não pode depender de ${forbidden}.`,
  );
}

for (const fragment of [
  "- name: Build",
  "VITE_APP_ENV: development",
  'VITE_CI_RUNTIME_SMOKE: "true"',
  "VITE_SUPABASE_PUBLISHABLE_KEY: sb_publishable_ci_runtime_smoke_only_not_for_deployment",
  "- name: Smoke no navegador",
  "id: browser",
  "if: steps.build.outcome == 'success'",
  "continue-on-error: true",
  "run: node scripts/run-browser-runtime-smoke.mjs",
  "- name: Exportar evidência do navegador",
  "artifacts/browser-smoke",
  "BROWSER: ${{ steps.browser.outcome }}",
  "navegador: **${process.env.BROWSER}**",
  'test "$BROWSER" = success',
]) {
  expect(workflow.includes(fragment), `Workflow B118/B119 perdeu a garantia: ${fragment}`);
}
expect(
  !workflow.includes("secrets.SUPABASE_DEV_PUBLISHABLE_KEY"),
  "O smoke B118 não pode voltar a depender de uma chave ausente no CI.",
);

expect(
  parent.includes('await import("./check-browser-runtime-smoke-contract.mjs")'),
  "Contrato B118 deve permanecer encadeado ao gate de determinismo do CI.",
);

for (const fragment of [
  "FASE B118",
  "Chrome headless",
  "`/login`",
  "`/certificado`",
  "Route Error Boundary",
  "Nenhuma migration",
  "Supabase remoto não foi modificado",
  "branch `main` não foi alterada",
  "Nenhuma dependência ou lockfile foi alterado",
]) {
  expect(documentation.includes(fragment), `Documentação B118 ausente: ${fragment}`);
}

if (failures.length > 0) {
  console.error("Contrato B118/B119 inválido:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(
  "Contrato B118/B119 aprovado: Chrome headless executa um build development hidratável com configuração sintética isolada e resultado bloqueante no CI.",
);

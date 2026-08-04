import { existsSync, readFileSync } from "node:fs";

const paths = {
  runtime: "scripts/run-browser-runtime-smoke.mjs",
  cdpClient: "scripts/lib/cdp-client.mjs",
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
const cdpClient = read(paths.cdpClient);
const workflow = read(paths.workflow);
const parent = read(paths.parent);
const documentation = read(paths.documentation);

for (const fragment of [
  'import { CdpClient } from "./lib/cdp-client.mjs";',
  'path.join(root, "artifacts", "browser-smoke")',
  'process.env.BROWSER_EXECUTABLE',
  '"/usr/bin/google-chrome"',
  '"/usr/bin/chromium"',
  '"--headless=new"',
  '"--no-sandbox"',
  '"--disable-dev-shm-usage"',
  '"--remote-debugging-address=127.0.0.1"',
  '`--remote-debugging-port=${browserDebugPort}`',
  '"--remote-allow-origins=*"',
  '`${browserDebugUrl}/json/version`',
  'CdpClient.connect(webSocketDebuggerUrl)',
  'client.request("Target.createTarget"',
  'client.request("Target.attachToTarget"',
  'client.request("Page.enable"',
  'client.request("Runtime.enable"',
  'client.request("Log.enable"',
  'client.waitForEvent("Page.loadEventFired"',
  'client.request("Page.navigate"',
  '"Runtime.exceptionThrown"',
  '"Runtime.consoleAPICalled"',
  '"Log.entryAdded"',
  '"Runtime.evaluate"',
  'root?.innerHTML ?? ""',
  'waitForRenderedRoot(client, sessionId)',
  'client.request("Target.closeTarget"',
  'cdpClient.close()',
  'rmSync(browserProfileDirectory, { recursive: true, force: true })',
  'pathname: "/"',
  'pathname: "/login"',
  'pathname: "/certificado"',
  '"Conteúdo publicado pelo instrutor"',
  '"Acesse sua conta para continuar aprendendo."',
  '"Validar certificado"',
  '"Esta página não pôde ser carregada"',
  '`${route.name}.runtime.json`',
  '`${route.name}.html`',
  '"chrome-process.log"',
  '"preview-process.log"',
]) {
  expect(runtime.includes(fragment), `Runtime B118 perdeu a garantia: ${fragment}`);
}

for (const fragment of [
  "export class CdpClient",
  "static async connect(url",
  "request(",
  "addEventListener(listener)",
  "waitForEvent(method, sessionId",
  "Timeout na chamada CDP",
  "close()",
]) {
  expect(cdpClient.includes(fragment), `Cliente CDP B118 perdeu a garantia: ${fragment}`);
}

for (const forbidden of [
  "playwright",
  "puppeteer",
  "selenium",
  "webdriver",
  '"--dump-dom"',
  '"--virtual-time-budget',
]) {
  expect(
    !runtime.toLocaleLowerCase("pt-BR").includes(forbidden.toLocaleLowerCase("pt-BR")),
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
  "Chrome DevTools Protocol",
  "`/login`",
  "`/certificado`",
  "Route Error Boundary",
  "aguarda o evento de carregamento",
  "`#root` possuir conteúdo",
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
  "Contrato B118/B119 aprovado: Chrome headless usa CDP para aguardar o commit React, capturar exceções e validar um build development com configuração sintética isolada.",
);

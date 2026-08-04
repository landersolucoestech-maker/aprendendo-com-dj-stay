import { existsSync, readFileSync } from "node:fs";

const paths = {
  runtime: "scripts/run-browser-runtime-smoke.mjs",
  cdpClient: "scripts/lib/cdp-client.mjs",
  workflow: ".github/workflows/baseline.yml",
  parent: "scripts/check-ci-determinism.mjs",
  documentation: "docs/refactor/FASE-B118-HEADLESS-BROWSER-SMOKE.md",
  matrixDocumentation: "docs/refactor/FASE-B122-PUBLIC-ROUTE-MATRIX-SMOKE.md",
  accessibilityDocumentation:
    "docs/refactor/FASE-B123-BROWSER-ACCESSIBILITY-READINESS.md",
};

const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};
const read = (path) => (existsSync(path) ? readFileSync(path, "utf8") : "");

for (const path of Object.values(paths)) {
  expect(existsSync(path), `Arquivo B118/B122/B123 ausente: ${path}`);
}

const runtime = read(paths.runtime);
const cdpClient = read(paths.cdpClient);
const workflow = read(paths.workflow);
const parent = read(paths.parent);
const documentation = read(paths.documentation);
const matrixDocumentation = read(paths.matrixDocumentation);
const accessibilityDocumentation = read(paths.accessibilityDocumentation);

for (const fragment of [
  'import { CdpClient } from "./lib/cdp-client.mjs";',
  'path.join(root, "artifacts", "browser-smoke")',
  "process.env.BROWSER_EXECUTABLE",
  '"/usr/bin/google-chrome"',
  '"/usr/bin/chromium"',
  '"--headless=new"',
  '"--no-sandbox"',
  '"--disable-dev-shm-usage"',
  '"--remote-debugging-address=127.0.0.1"',
  '`--remote-debugging-port=${browserDebugPort}`',
  '"--remote-allow-origins=*"',
  '`${browserDebugUrl}/json/version`',
  "CdpClient.connect(webSocketDebuggerUrl)",
  '"Target.createTarget"',
  '"Target.attachToTarget"',
  '"Page.enable"',
  '"Runtime.enable"',
  '"Log.enable"',
  '"Emulation.setDeviceMetricsOverride"',
  '"Page.loadEventFired"',
  '"Page.navigate"',
  '"Runtime.exceptionThrown"',
  '"Runtime.consoleAPICalled"',
  '"Log.entryAdded"',
  '"Runtime.evaluate"',
  'root?.innerHTML ?? ""',
  'document.getElementById("main-content")',
  'document.querySelectorAll("#main-content").length',
  'mainContent?.matches(\'main, [role="main"]\')',
  'mainContent?.getAttribute("tabindex") ?? null',
  'document.querySelectorAll(\'a[href="#main-content"]\')',
  '"Pular para o conteúdo principal"',
  "liveRegionCount",
  "accessibilityReady",
  "waitForRouteReady(client, sessionId, route)",
  "route.required.every((fragment)",
  '"Target.closeTarget"',
  "cdpClient.close()",
  "rmSync(browserProfileDirectory, { recursive: true, force: true })",
  'pathname: "/"',
  'pathname: "/login"',
  'pathname: "/certificado"',
  'pathname: "/contato"',
  'pathname: "/matricule-se"',
  'pathname: "/esqueceu-senha"',
  'pathname: "/acesso-negado"',
  'pathname: "/rota-inexistente-b122"',
  '"Conteúdo publicado pelo instrutor"',
  '"Acesse sua conta para continuar aprendendo."',
  '"Validar certificado"',
  '"Solicitação de contato"',
  '"Matricule-se"',
  '"Recuperar senha"',
  '"Acesso negado"',
  '"Página não encontrada"',
  '"Esta página não pôde ser carregada"',
  '`${route.name}.runtime.json`',
  '`${route.name}.html`',
  '"chrome-process.log"',
  '"preview-process.log"',
  "prontidão acessível",
]) {
  expect(
    runtime.includes(fragment),
    `Runtime B118/B122/B123 perdeu a garantia: ${fragment}`,
  );
}

const routeNames = [
  "home",
  "login",
  "certificate",
  "contact",
  "register",
  "forgot-password",
  "access-denied",
  "not-found",
];
for (const routeName of routeNames) {
  expect(
    runtime.includes(`name: "${routeName}"`),
    `Matriz B122 perdeu a rota nomeada ${routeName}.`,
  );
}
expect(
  (runtime.match(/\n\s+name: "(?:home|login|certificate|contact|register|forgot-password|access-denied|not-found)"/g) ?? []).length === 8,
  "Matriz B122 deve possuir exatamente as oito rotas públicas contratadas.",
);

expect(
  /const waitForRouteReady = async \(client, sessionId, route\) => \{[\s\S]*?attempt < 80[\s\S]*?route\.required\.every\(\(fragment\) =>[\s\S]*?const accessibilityReady =[\s\S]*?mainContentCount === 1[\s\S]*?mainContentIsLandmark === true[\s\S]*?mainContentTabIndex === "-1"[\s\S]*?skipLinkCount === 1[\s\S]*?skipLinkText\.includes\("Pular para o conteúdo principal"\)[\s\S]*?liveRegionCount >= 1[\s\S]*?requiredContentReady &&[\s\S]*?accessibilityReady/s.test(
    runtime,
  ),
  "Prontidão B118/B122/B123 deve aguardar conteúdo final e estrutura acessível completa.",
);
expect(
  !runtime.includes("waitForRenderedRoot"),
  "B118/B122/B123 não pode voltar a aceitar o primeiro fallback não vazio como página pronta.",
);
for (const validationFragment of [
  "state?.mainContentCount !== 1",
  "state?.mainContentIsLandmark !== true",
  'state?.mainContentTabIndex !== "-1"',
  "state?.skipLinkCount !== 1",
  'state?.skipLinkText?.includes("Pular para o conteúdo principal")',
  "state?.liveRegionCount",
]) {
  expect(
    runtime.includes(validationFragment),
    `Validação pós-espera B123 ausente: ${validationFragment}`,
  );
}
expect(
  /client\.request\(\s*"Target\.createTarget",\s*\{\s*url:\s*"about:blank",\s*background:\s*false,?\s*\}\s*\)/s.test(
    runtime,
  ),
  "Target.createTarget deve criar uma aba isolada sem parâmetros de posição incompatíveis.",
);
expect(
  !/client\.request\(\s*"Target\.createTarget"[\s\S]*?newWindow:\s*false[\s\S]*?\)/.test(
    runtime,
  ),
  "Target.createTarget não pode voltar a combinar dimensões de janela com newWindow=false.",
);
expect(
  /client\.request\(\s*"Emulation\.setDeviceMetricsOverride",\s*\{[\s\S]*?width:\s*1440,[\s\S]*?height:\s*1000,[\s\S]*?deviceScaleFactor:\s*1,[\s\S]*?mobile:\s*false,[\s\S]*?\},\s*sessionId,?\s*\)/.test(
    runtime,
  ),
  "Viewport B118/B122/B123 deve permanecer definido via Emulation.setDeviceMetricsOverride.",
);
expect(
  /client\.request\(\s*"Page\.navigate",\s*\{\s*url:\s*`\$\{baseUrl\}\$\{route\.pathname\}`\s*\},\s*sessionId,\s*20_000,?\s*\)/s.test(
    runtime,
  ),
  "Navegação B118/B122/B123 deve permanecer direcionada à rota atual pelo CDP.",
);

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
    !runtime
      .toLocaleLowerCase("pt-BR")
      .includes(forbidden.toLocaleLowerCase("pt-BR")),
    `Runtime B118/B122/B123 não pode depender de ${forbidden}.`,
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
  expect(
    workflow.includes(fragment),
    `Workflow B118/B119/B122/B123 perdeu a garantia: ${fragment}`,
  );
}
expect(
  !workflow.includes("secrets.SUPABASE_DEV_PUBLISHABLE_KEY"),
  "O smoke B118/B122/B123 não pode voltar a depender de uma chave ausente no CI.",
);

expect(
  parent.includes('await import("./check-browser-runtime-smoke-contract.mjs")'),
  "Contrato B118/B122/B123 deve permanecer encadeado ao gate de determinismo do CI.",
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

for (const fragment of [
  "FASE B122",
  "`/contato`",
  "`/matricule-se`",
  "`/esqueceu-senha`",
  "`/acesso-negado`",
  "`/rota-inexistente-b122`",
  "oito rotas",
  "não submete formulários",
  "Nenhum usuário, contato ou pedido foi criado",
  "Supabase remoto não foi modificado",
]) {
  expect(
    matrixDocumentation.includes(fragment),
    `Documentação B122 ausente: ${fragment}`,
  );
}

for (const fragment of [
  "FASE B123",
  "login e certificado",
  "requestAnimationFrame",
  "exatamente um elemento com `id=\"main-content\"`",
  "`tabindex=\"-1\"`",
  "`Pular para o conteúdo principal`",
  "live region",
  "A mesma propriedades são revalidadas",
  "Supabase remoto não foi modificado",
]) {
  expect(
    accessibilityDocumentation.includes(fragment),
    `Documentação B123 ausente: ${fragment}`,
  );
}

if (failures.length > 0) {
  console.error(
    "Contrato B118/B119/B122/B123 inválido:\n- " +
      [...new Set(failures)].join("\n- "),
  );
  process.exit(1);
}

console.log(
  "Contrato B118/B119/B122/B123 aprovado: Chrome headless valida oito rotas públicas com conteúdo final, landmark, skip link e live region prontos.",
);

import { existsSync, readFileSync } from "node:fs";

const paths = {
  source: "src/accessibility/RouteAccessibility.tsx",
  runtime: "scripts/run-browser-client-navigation-smoke.mjs",
  documentation: "docs/refactor/FASE-B138-TRUSTED-SKIP-LINK-KEYBOARD.md",
  parent: "scripts/check-ci-determinism.mjs",
};
const failures = [];
const read = (path) => (existsSync(path) ? readFileSync(path, "utf8") : "");
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

for (const path of Object.values(paths)) {
  expect(existsSync(path), `Arquivo B138 ausente: ${path}`);
}

const source = read(paths.source);
const runtime = read(paths.runtime);
const documentation = read(paths.documentation);
const parent = read(paths.parent);

for (const fragment of [
  'type MouseEvent,',
  'const handleSkipToContent = (event: MouseEvent<HTMLAnchorElement>) =>',
  "event.preventDefault()",
  "const target = preparePrimaryContent()",
  "target.focus({ preventScroll: true })",
  "focusedPathRef.current = location.pathname",
  "focusedTargetRef.current = target",
  'target.scrollIntoView({ block: "start" })',
  'href={`#${focusTargetId}`}',
  "onClick={handleSkipToContent}",
  "Pular para o conteúdo principal",
]) {
  expect(source.includes(fragment), `RouteAccessibility perdeu B138: ${fragment}`);
}

expect(
  /const handleSkipToContent = \(event: MouseEvent<HTMLAnchorElement>\) => \{[\s\S]*?event\.preventDefault\(\)[\s\S]*?const target = preparePrimaryContent\(\)[\s\S]*?target\.focus\(\{ preventScroll: true \}\)[\s\S]*?focusedPathRef\.current = location\.pathname[\s\S]*?focusedTargetRef\.current = target[\s\S]*?target\.scrollIntoView\(\{ block: "start" \}\)/s.test(
    source,
  ),
  "O handler B138 deve prevenir o fragmento, preparar o conteúdo e registrar o foco real antes do scroll.",
);

for (const fragment of [
  'const skipLinkSelector = \'a[href="#main-content"]\'',
  "prepareSkipLinkProbe",
  "waitForSkipLinkFocus",
  "waitForSkipLinkActivation",
  "const dispatchTrustedKey = async",
  '"Input.dispatchKeyEvent"',
  'type: "keyDown"',
  'type: "keyUp"',
  'key: "Tab"',
  'code: "Tab"',
  "virtualKeyCode: 9",
  'key: "Enter"',
  'code: "Enter"',
  "virtualKeyCode: 13",
  'window.__b138SkipLinkProbe = {',
  'window.addEventListener("keydown", handleKeydown)',
  'window.addEventListener("click", handleClick)',
  "event.isTrusted",
  "event.defaultPrevented",
  'state.activeElementTagName === "A"',
  'state.activeElementHref === "#main-content"',
  'state.activeElementText === "Pular para o conteúdo principal"',
  "state.activeElementVisible === true",
  'state.activeElementId === "main-content"',
  "state.activeElementConnected === true",
  'state.skipLinkProbe.click.defaultPrevented === true',
  "state.skipLinkProbe.click.detail === 0",
  'networkPhase = "skip-link-tab"',
  'networkPhase = "skip-link-enter"',
  '"client-navigation.skip-link.json"',
  "O primeiro Tab B138 não focou o skip link visível.",
  "O Enter B138 não transferiu o foco para #main-content.",
  "O clique gerado pelo teclado B138 não foi confiável.",
  "O handler do skip link B138 não preveniu a navegação padrão.",
  "A ativação B138 não possui semântica de clique por teclado.",
]) {
  expect(runtime.includes(fragment), `Smoke B138 ausente: ${fragment}`);
}

expect(
  /prepareSkipLinkProbe\(sessionId\)[\s\S]*?networkPhase = "skip-link-tab"[\s\S]*?dispatchTrustedKey\(sessionId, \{[\s\S]*?key: "Tab"[\s\S]*?waitForSkipLinkFocus\(sessionId\)[\s\S]*?networkPhase = "skip-link-enter"[\s\S]*?dispatchTrustedKey\(sessionId, \{[\s\S]*?key: "Enter"[\s\S]*?waitForSkipLinkActivation\(sessionId\)[\s\S]*?prepareTrustedLoginInteraction\(sessionId\)/s.test(
    runtime,
  ),
  "B138 deve provar Tab e Enter no skip link antes de acionar o login real.",
);
expect(
  /const waitForSkipLinkActivation = async \(session\) =>[\s\S]*?state\.skipLinkProbe\?\.click\?\.isTrusted === true[\s\S]*?state\.skipLinkProbe\.click\.defaultPrevented === true[\s\S]*?state\.skipLinkProbe\.click\.detail === 0/s.test(
    runtime,
  ),
  "B138 deve exigir no estado final clique confiável, prevenido e com semântica de teclado.",
);
expect(
  /const handleClick = \(event\) => \{[\s\S]*?window\.__b138SkipLinkProbe\.click = \{[\s\S]*?isTrusted: event\.isTrusted[\s\S]*?defaultPrevented: event\.defaultPrevented[\s\S]*?detail: event\.detail[\s\S]*?window\.addEventListener\("click", handleClick\)/s.test(
    runtime,
  ),
  "B138 deve observar o clique no window depois do handler React e persistir seus campos reais.",
);

for (const forbidden of [
  ".focus(",
  "new KeyboardEvent",
  "dispatchEvent(",
  "window.history.pushState",
  "PopStateEvent",
  "HTMLElement.prototype.click",
]) {
  expect(
    !runtime.includes(forbidden),
    `Smoke B138 contém atalho artificial proibido: ${forbidden}`,
  );
}

for (const fragment of [
  "FASE B138",
  "o primeiro `Tab` alcançar o skip link",
  "controle tornar-se visível quando focado",
  "`Enter` produzir um clique confiável",
  "handler prevenir a navegação pelo fragmento",
  "`Input.dispatchKeyEvent`",
  "`defaultPrevented === true`",
  "permanência na rota `/`",
  "`client-navigation.skip-link.json`",
  "ausência de `HTMLElement.focus()` usado pelo smoke",
  "Também proíbe `new KeyboardEvent`, `dispatchEvent`, `history.pushState` e `PopStateEvent`",
  "Supabase remoto não foi modificado",
  "Nenhuma migration, dependência ou lockfile foi alterado",
  "Produção e branch `main` permanecem sem promoção",
]) {
  expect(documentation.includes(fragment), `Documentação B138 ausente: ${fragment}`);
}

expect(
  parent.includes('await import("./check-skip-link-keyboard-interaction.mjs")'),
  "Contrato B138 deve permanecer encadeado ao gate de determinismo do CI.",
);

if (failures.length > 0) {
  console.error(
    "Contrato B138 inválido:\n- " + [...new Set(failures)].join("\n- "),
  );
  process.exit(1);
}

console.log(
  "Contrato B138 aprovado: o skip link é alcançado e ativado por teclado confiável, com foco real no conteúdo e sem eventos artificiais.",
);
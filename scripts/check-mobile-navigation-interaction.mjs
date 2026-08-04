import { existsSync, readFileSync } from "node:fs";

const paths = {
  navigation: "src/components/Navigation.tsx",
  runtime: "scripts/run-browser-mobile-navigation-smoke.mjs",
  workflow: ".github/workflows/baseline.yml",
  documentation: "docs/refactor/FASE-B136-TRUSTED-MOBILE-NAVIGATION.md",
  keyboardDocumentation:
    "docs/refactor/FASE-B137-MOBILE-MENU-KEYBOARD-FOCUS.md",
  parent: "scripts/check-ci-determinism.mjs",
};
const failures = [];
const read = (path) => (existsSync(path) ? readFileSync(path, "utf8") : "");
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

for (const path of Object.values(paths)) {
  expect(existsSync(path), `Arquivo B136/B137 ausente: ${path}`);
}

const navigation = read(paths.navigation);
const runtime = read(paths.runtime);
const workflow = read(paths.workflow);
const documentation = read(paths.documentation);
const keyboardDocumentation = read(paths.keyboardDocumentation);
const parent = read(paths.parent);

for (const fragment of [
  "const mobileFocusableSelector =",
  "mobileMenuRef.current",
  "?.querySelector<HTMLElement>(mobileFocusableSelector)",
  "?.focus()",
  'if (event.key !== "Escape") return',
  "event.preventDefault()",
  "setIsOpen(false)",
  "window.requestAnimationFrame(() => menuButtonRef.current?.focus())",
  'document.addEventListener("keydown", handleEscape)',
  'document.removeEventListener("keydown", handleEscape)',
  'aria-label={isOpen ? "Fechar menu" : "Abrir menu"}',
  'aria-controls="mobile-navigation"',
  'aria-expanded={isOpen}',
  'id="mobile-navigation"',
  'className="space-y-2 border-t border-border py-4 md:hidden"',
  'renderAccountActions(true)',
  '<Link to="/login" onClick={closeMenu}>',
]) {
  expect(
    navigation.includes(fragment),
    `Navigation perdeu a garantia B136/B137: ${fragment}`,
  );
}

for (const fragment of [
  'const menuButtonSelector =',
  'button[aria-controls="mobile-navigation"]',
  'const mobileLoginSelector = \'#mobile-navigation a[href="/login"]\'',
  "width: 390",
  "height: 844",
  "mobile: true",
  'state.menuExpanded === "false"',
  'state.menuLabel === "Abrir menu"',
  'state.menuExpanded === "true"',
  'state.menuLabel === "Fechar menu"',
  "document.elementFromPoint(x, y)?.closest(selector)",
  'document.addEventListener("click", (event) => {',
  "}, true);",
  '"Input.dispatchMouseEvent"',
  'type: "mousePressed"',
  'type: "mouseReleased"',
  'interaction.kind === "menu-toggle"',
  'interaction.kind === "login-link"',
  "interaction.isTrusted === true",
  'state.activeElementId === "main-content"',
  "state.activeElementConnected === true",
  "Navegação concluída. Conteúdo principal atualizado.",
  "documents.length !== 1",
  'entry.phase === "client-navigation"',
  "requestUrl.origin !== documentUrl.origin",
  "Number(entry.status) >= 400",
  '"mobile-navigation.evidence.json"',
  "const dispatchTrustedEscape = async () =>",
  '"Input.dispatchKeyEvent"',
  'type: "keyDown"',
  'type: "keyUp"',
  'key: "Escape"',
  'code: "Escape"',
  "windowsVirtualKeyCode: 27",
  "window.__b137KeyboardProbe = []",
  'window.addEventListener("keydown", (event) => {',
  "event.defaultPrevented",
  "activeElementWithinMobileMenu",
  'state.activeElementTagName === "BUTTON"',
  'state.activeElementText === "Início"',
  'state.activeElementAriaControls === "mobile-navigation"',
  'event.defaultPrevented === true',
  'phase: "mobile-menu-escape"',
  'phase: "mobile-menu-reopen"',
  "firstOpenState",
  "keyboardClosedState",
  "keyboardEvents: finalState?.keyboardEvents ?? []",
  "O Escape B137 não fechou o menu móvel.",
  "O Escape B137 não devolveu o foco ao botão do menu.",
  "O handler B137 não preveniu o comportamento padrão do Escape.",
]) {
  expect(runtime.includes(fragment), `Smoke B136/B137 ausente: ${fragment}`);
}

expect(
  /document\.addEventListener\("click", \(event\) => \{[\s\S]*?window\.__b136InteractionProbe\.push\([\s\S]*?\}, true\);/.test(
    runtime,
  ),
  "A sonda B136 deve capturar o clique antes que React substitua o alvo do botão.",
);
expect(
  /window\.addEventListener\("keydown", \(event\) => \{[\s\S]*?window\.__b137KeyboardProbe\.push\([\s\S]*?defaultPrevented: event\.defaultPrevented[\s\S]*?\}\);/.test(
    runtime,
  ),
  "A sonda B137 deve observar em window o estado final do keydown após o handler do document.",
);
expect(
  /firstOpenState = await waitForState\([\s\S]*?activeElementWithinMobileMenu === true[\s\S]*?activeElementText === "Início"[\s\S]*?dispatchTrustedEscape\(\)[\s\S]*?keyboardClosedState = await waitForState\([\s\S]*?activeElementAriaControls === "mobile-navigation"[\s\S]*?event\.defaultPrevented === true[\s\S]*?phase: "mobile-menu-reopen"/s.test(
    runtime,
  ),
  "B137 deve provar foco inicial, Escape prevenido, retorno ao botão e reabertura nessa ordem.",
);

for (const forbidden of [
  ".click()",
  "HTMLElement.prototype.click",
  "window.history.pushState",
  "PopStateEvent",
  "new KeyboardEvent",
  "dispatchEvent(",
]) {
  expect(
    !runtime.includes(forbidden),
    `Smoke B136/B137 contém interação artificial proibida: ${forbidden}`,
  );
}

for (const fragment of [
  "node scripts/run-browser-client-navigation-smoke.mjs",
  "node scripts/run-browser-mobile-navigation-smoke.mjs",
  "node scripts/check-browser-network-isolation.mjs",
]) {
  expect(workflow.includes(fragment), `Workflow B136/B137 ausente: ${fragment}`);
}
expect(
  /run-browser-client-navigation-smoke\.mjs[\s\S]*?run-browser-mobile-navigation-smoke\.mjs[\s\S]*?check-browser-network-isolation\.mjs/.test(
    workflow,
  ),
  "Workflow B136/B137 deve executar desktop, móvel e verificação consolidada nessa ordem.",
);

for (const fragment of [
  "FASE B136",
  "viewport móvel de 390 × 844",
  "`aria-expanded=\"false\"`",
  "`aria-expanded=\"true\"`",
  "sonda instalada na fase bubble não registrou o clique do botão",
  "desconectando o alvo original",
  "fase capture",
  "antes das mutações React do DOM",
  "`document.addEventListener(\"click\", ..., true)`",
  "`document.elementFromPoint`",
  "`Input.dispatchMouseEvent`",
  "evento confiável",
  "menu desmontado",
  "exatamente um `Document` inicial",
  "nenhum novo `Document`",
  "`mobile-navigation.evidence.json`",
  "Supabase remoto não foi modificado",
  "Nenhuma migration, dependência ou lockfile foi alterado",
  "Produção e branch `main` permanecem sem promoção",
]) {
  expect(documentation.includes(fragment), `Documentação B136 ausente: ${fragment}`);
}

for (const fragment of [
  "FASE B137",
  "foco automático no primeiro controle",
  "fechamento por `Escape`",
  "retorno do foco ao botão do menu",
  "`Input.dispatchKeyEvent`",
  "evento `keydown` confiável",
  "`defaultPrevented === true`",
  "foco devolvido ao botão com `aria-controls=\"mobile-navigation\"`",
  "A sonda de teclado é instalada em `window`",
  "dois cliques confiáveis no botão",
  "ausência de `KeyboardEvent` artificial ou `dispatchEvent`",
  "Supabase remoto não foi modificado",
  "Nenhuma migration, dependência ou lockfile foi alterado",
  "Produção e branch `main` permanecem sem promoção",
]) {
  expect(
    keyboardDocumentation.includes(fragment),
    `Documentação B137 ausente: ${fragment}`,
  );
}

expect(
  parent.includes('await import("./check-mobile-navigation-interaction.mjs")'),
  "Contrato B136/B137 deve permanecer encadeado ao gate de determinismo do CI.",
);

if (failures.length > 0) {
  console.error(
    "Contrato B136/B137 inválido:\n- " +
      [...new Set(failures)].join("\n- "),
  );
  process.exit(1);
}

console.log(
  "Contrato B136/B137 aprovado: cliques móveis, foco inicial, Escape prevenido, retorno ao botão, login e rede permanecem bloqueantes e confiáveis.",
);
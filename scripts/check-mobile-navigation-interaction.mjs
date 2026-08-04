import { existsSync, readFileSync } from "node:fs";

const paths = {
  navigation: "src/components/Navigation.tsx",
  runtime: "scripts/run-browser-mobile-navigation-smoke.mjs",
  workflow: ".github/workflows/baseline.yml",
  documentation: "docs/refactor/FASE-B136-TRUSTED-MOBILE-NAVIGATION.md",
  parent: "scripts/check-ci-determinism.mjs",
};
const failures = [];
const read = (path) => (existsSync(path) ? readFileSync(path, "utf8") : "");
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

for (const path of Object.values(paths)) {
  expect(existsSync(path), `Arquivo B136 ausente: ${path}`);
}

const navigation = read(paths.navigation);
const runtime = read(paths.runtime);
const workflow = read(paths.workflow);
const documentation = read(paths.documentation);
const parent = read(paths.parent);

for (const fragment of [
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
    `Navigation perdeu a garantia móvel B136: ${fragment}`,
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
]) {
  expect(runtime.includes(fragment), `Smoke B136 ausente: ${fragment}`);
}

for (const forbidden of [
  ".click()",
  "HTMLElement.prototype.click",
  "window.history.pushState",
  "PopStateEvent",
  "dispatchEvent(",
]) {
  expect(
    !runtime.includes(forbidden),
    `Smoke B136 contém interação artificial proibida: ${forbidden}`,
  );
}

for (const fragment of [
  "node scripts/run-browser-client-navigation-smoke.mjs",
  "node scripts/run-browser-mobile-navigation-smoke.mjs",
  "node scripts/check-browser-network-isolation.mjs",
]) {
  expect(workflow.includes(fragment), `Workflow B136 ausente: ${fragment}`);
}
expect(
  /run-browser-client-navigation-smoke\.mjs[\s\S]*?run-browser-mobile-navigation-smoke\.mjs[\s\S]*?check-browser-network-isolation\.mjs/.test(
    workflow,
  ),
  "Workflow B136 deve executar desktop, móvel e verificação consolidada nessa ordem.",
);

for (const fragment of [
  "FASE B136",
  "viewport móvel de 390 × 844",
  "`aria-expanded=\"false\"`",
  "`aria-expanded=\"true\"`",
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

expect(
  parent.includes('await import("./check-mobile-navigation-interaction.mjs")'),
  "Contrato B136 deve permanecer encadeado ao gate de determinismo do CI.",
);

if (failures.length > 0) {
  console.error(
    "Contrato B136 inválido:\n- " + [...new Set(failures)].join("\n- "),
  );
  process.exit(1);
}

console.log(
  "Contrato B136 aprovado: menu e login móveis são exercitados por cliques confiáveis, com estado ARIA, foco, documento e rede bloqueantes.",
);
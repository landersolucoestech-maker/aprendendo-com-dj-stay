import { existsSync, readFileSync } from "node:fs";

const paths = {
  source: "src/accessibility/RouteAccessibility.tsx",
  routeFallback: "src/routing/RouteLoadingFallback.tsx",
  authFallback: "src/routing/AuthLoadingScreen.tsx",
  browserRuntime: "scripts/run-browser-client-navigation-smoke.mjs",
  workflow: ".github/workflows/baseline.yml",
  documentation: "docs/refactor/FASE-B125-LAZY-ROUTE-FOCUS-HANDOFF.md",
  realInteractionDocumentation:
    "docs/refactor/FASE-B135-REAL-NAVIGATION-INTERACTION.md",
  parent: "scripts/check-ci-determinism.mjs",
};

const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};
const read = (path) => (existsSync(path) ? readFileSync(path, "utf8") : "");

for (const path of Object.values(paths)) {
  expect(existsSync(path), `Arquivo B125/B135 ausente: ${path}`);
}

const source = read(paths.source);
const routeFallback = read(paths.routeFallback);
const authFallback = read(paths.authFallback);
const browserRuntime = read(paths.browserRuntime);
const workflow = read(paths.workflow);
const documentation = read(paths.documentation);
const realInteractionDocumentation = read(paths.realInteractionDocumentation);
const parent = read(paths.parent);

for (const fragment of [
  'const focusDeferredAttribute = "data-route-focus-deferred"',
  "const focusedPathRef = useRef<string | null>(null)",
  "const focusedTargetRef = useRef<HTMLElement | null>(null)",
  "const routeChanged = previousPathRef.current !== location.pathname",
  "const focusIsDeferred =",
  'target.getAttribute(focusDeferredAttribute) === "true"',
  "const focusedTargetWasReplaced =",
  "focusedPathRef.current === location.pathname",
  "focusedTargetRef.current !== null",
  "!focusedTargetRef.current.isConnected",
  "if (routeChanged && focusIsDeferred)",
  "if (routeChanged || focusedTargetWasReplaced)",
  "target.focus({ preventScroll: true })",
  "focusedPathRef.current = location.pathname",
  "focusedTargetRef.current = target",
  'setAnnouncement(\n              "Navegação concluída. Conteúdo principal atualizado.",',
  "previousPathRef.current = location.pathname",
]) {
  expect(source.includes(fragment), `RouteAccessibility perdeu a garantia B125: ${fragment}`);
}

expect(
  /const routeChanged =[\s\S]*?const focusIsDeferred =[\s\S]*?const focusedTargetWasReplaced =[\s\S]*?if \(routeChanged && focusIsDeferred\) \{\s*return;\s*\}[\s\S]*?if \(routeChanged \|\| focusedTargetWasReplaced\) \{[\s\S]*?target\.focus\([\s\S]*?focusedPathRef\.current = location\.pathname[\s\S]*?focusedTargetRef\.current = target[\s\S]*?if \(routeChanged\) \{[\s\S]*?setAnnouncement\([\s\S]*?\}[\s\S]*?\}[\s\S]*?previousPathRef\.current = location\.pathname/s.test(
    source,
  ),
  "B125 deve adiar o fallback, focar o conteúdo final e recuperar somente um target focado que foi desconectado.",
);
expect(
  /const handleSkipToContent =[\s\S]*?target\.focus\([\s\S]*?focusedPathRef\.current = location\.pathname[\s\S]*?focusedTargetRef\.current = target[\s\S]*?target\.scrollIntoView/s.test(
    source,
  ),
  "O skip link B125 deve registrar o target focado para permitir recuperação após substituição.",
);

for (const [name, content] of [
  ["RouteLoadingFallback", routeFallback],
  ["AuthLoadingScreen", authFallback],
]) {
  expect(content.includes('aria-busy="true"'), `${name} deve permanecer ocupado.`);
  expect(
    content.includes('data-route-focus-deferred="true"'),
    `${name} deve permanecer marcado para foco diferido.`,
  );
}

for (const fragment of [
  'import { CdpClient } from "./lib/cdp-client.mjs";',
  '"Network.enable"',
  '"Network.emulateNetworkConditions"',
  "latency: 500",
  'nav[aria-label="Navegação principal"] a[href="/login"]',
  "prepareTrustedLoginInteraction",
  "document.elementFromPoint(x, y)?.closest(selector)",
  'document.addEventListener("click", handleClick)',
  "event.isTrusted",
  '"Input.dispatchMouseEvent"',
  'type: "mousePressed"',
  'type: "mouseReleased"',
  'interaction: "trusted-click"',
  'data-route-focus-deferred="true"',
  "sawDeferred",
  "deferredFocused",
  'activeElementId === "main-content"',
  "activeElementConnected === true",
  "Navegação concluída. Conteúdo principal atualizado.",
  'state.interaction?.isTrusted === true',
  'state.interaction?.text === "Entrar"',
  'state.interaction?.pathname === "/login"',
  '"client-navigation.html"',
  '"client-navigation.runtime.json"',
  '"client-navigation.probe.json"',
  '"client-navigation.interaction.json"',
  "O evento de clique B135 não foi confiável para o navegador.",
  "A transição B125 não observou o fallback com foco diferido.",
  "O fallback B125 recebeu foco durante a navegação.",
]) {
  expect(
    browserRuntime.includes(fragment),
    `Smoke B125/B135 perdeu a garantia: ${fragment}`,
  );
}

for (const forbidden of [
  "window.history.pushState",
  "PopStateEvent",
  'window.dispatchEvent(new Event("popstate"',
]) {
  expect(
    !browserRuntime.includes(forbidden),
    `Smoke B135 preserva navegação artificial proibida: ${forbidden}`,
  );
}

expect(
  browserRuntime.includes('window.__b125RouteFocusObserver?.disconnect(); true'),
  "A sonda B125 deve desconectar seu observer após a transição.",
);

for (const fragment of [
  "node scripts/run-browser-runtime-smoke.mjs",
  "node scripts/run-browser-client-navigation-smoke.mjs",
]) {
  expect(workflow.includes(fragment), `Workflow B125/B135 perdeu o comando: ${fragment}`);
}
expect(
  /- name: Smoke no navegador[\s\S]*?run: \|[\s\S]*?run-browser-runtime-smoke\.mjs[\s\S]*?run-browser-client-navigation-smoke\.mjs/.test(
    workflow,
  ),
  "Os smokes B118/B125/B135 devem permanecer sequenciais no mesmo estágio bloqueante.",
);

for (const fragment of [
  "FASE B125",
  'data-route-focus-deferred="true"',
  "não move o foco, não anuncia conclusão e não atualiza `previousPathRef`",
  "navegação client-side para `/login`",
  "fallback nunca focado",
  "document.activeElement.id === \"main-content\"",
  "target previamente focado for desconectado",
  "não disparam refoco",
  "Nenhuma migration",
  "Supabase remoto não foi modificado",
  "Nenhuma dependência ou lockfile foi alterado",
]) {
  expect(documentation.includes(fragment), `Documentação B125 ausente: ${fragment}`);
}

for (const fragment of [
  "FASE B135",
  "`window.history.pushState`",
  "link real `Entrar`",
  "`Input.dispatchMouseEvent`",
  "`event.isTrusted === true`",
  "`client-navigation.interaction.json`",
  "nenhum novo `Document`",
  "Supabase remoto não foi modificado",
  "Nenhuma migration, dependência ou lockfile foi alterado",
]) {
  expect(
    realInteractionDocumentation.includes(fragment),
    `Documentação B135 ausente: ${fragment}`,
  );
}

expect(
  parent.includes('await import("./check-route-focus-handoff.mjs")'),
  "Contrato B125/B135 deve permanecer encadeado ao gate de determinismo do CI.",
);

if (failures.length > 0) {
  console.error(
    "Contrato B125/B135 inválido:\n- " +
      [...new Set(failures)].join("\n- "),
  );
  process.exit(1);
}

console.log(
  "Contrato B125/B135 aprovado: fallbacks mantêm foco diferido e a transição para login é acionada pelo link real com evento confiável, sem mutação artificial do histórico.",
);
import { existsSync, readFileSync } from "node:fs";

const paths = {
  source: "src/accessibility/RouteAccessibility.tsx",
  routeFallback: "src/routing/RouteLoadingFallback.tsx",
  authFallback: "src/routing/AuthLoadingScreen.tsx",
  browserRuntime: "scripts/run-browser-client-navigation-smoke.mjs",
  workflow: ".github/workflows/baseline.yml",
  documentation: "docs/refactor/FASE-B125-LAZY-ROUTE-FOCUS-HANDOFF.md",
  parent: "scripts/check-ci-determinism.mjs",
};

const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};
const read = (path) => (existsSync(path) ? readFileSync(path, "utf8") : "");

for (const path of Object.values(paths)) {
  expect(existsSync(path), `Arquivo B125 ausente: ${path}`);
}

const source = read(paths.source);
const routeFallback = read(paths.routeFallback);
const authFallback = read(paths.authFallback);
const browserRuntime = read(paths.browserRuntime);
const workflow = read(paths.workflow);
const documentation = read(paths.documentation);
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
  "window.history.pushState",
  'new PopStateEvent("popstate"',
  'data-route-focus-deferred="true"',
  "sawDeferred",
  "deferredFocused",
  'activeElementId === "main-content"',
  "activeElementConnected === true",
  "Navegação concluída. Conteúdo principal atualizado.",
  '"client-navigation.html"',
  '"client-navigation.runtime.json"',
  '"client-navigation.probe.json"',
  "A transição B125 não observou o fallback com foco diferido.",
  "O fallback B125 recebeu foco durante a navegação.",
]) {
  expect(browserRuntime.includes(fragment), `Smoke B125 perdeu a garantia: ${fragment}`);
}
expect(
  browserRuntime.includes('window.__b125RouteFocusObserver?.disconnect(); true'),
  "A sonda B125 deve desconectar seu observer após a transição.",
);

for (const fragment of [
  "node scripts/run-browser-runtime-smoke.mjs",
  "node scripts/run-browser-client-navigation-smoke.mjs",
]) {
  expect(workflow.includes(fragment), `Workflow B125 perdeu o comando: ${fragment}`);
}
expect(
  /- name: Smoke no navegador[\s\S]*?run: \|[\s\S]*?run-browser-runtime-smoke\.mjs[\s\S]*?run-browser-client-navigation-smoke\.mjs/.test(
    workflow,
  ),
  "Os smokes B118/B125 devem permanecer sequenciais no mesmo estágio bloqueante.",
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

expect(
  parent.includes('await import("./check-route-focus-handoff.mjs")'),
  "Contrato B125 deve permanecer encadeado ao gate de determinismo do CI.",
);

if (failures.length > 0) {
  console.error(
    "Contrato B125 inválido:\n- " + [...new Set(failures)].join("\n- "),
  );
  process.exit(1);
}

console.log(
  "Contrato B125 aprovado: fallbacks mantêm foco diferido e targets finais substituídos recuperam foco sem interferir em mutações normais.",
);

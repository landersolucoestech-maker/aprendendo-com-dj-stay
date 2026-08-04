import { existsSync, readFileSync } from "node:fs";

const paths = {
  source: "src/accessibility/RouteAccessibility.tsx",
  browserRuntime: "scripts/run-browser-runtime-smoke.mjs",
  documentation: "docs/refactor/FASE-B123-BROWSER-ACCESSIBILITY-READINESS.md",
  parent: "scripts/check-ci-determinism.mjs",
};

const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};
const read = (path) => (existsSync(path) ? readFileSync(path, "utf8") : "");

for (const path of Object.values(paths)) {
  expect(existsSync(path), `Arquivo B123 ausente: ${path}`);
}

const source = read(paths.source);
const browserRuntime = read(paths.browserRuntime);
const documentation = read(paths.documentation);
const parent = read(paths.parent);

for (const fragment of [
  'const focusTargetId = "main-content"',
  "const preparePrimaryContent = useCallback",
  'boundary.querySelector<HTMLElement>(\'main, [role="main"]\')',
  'boundary.setAttribute("role", "main")',
  "target.id = focusTargetId",
  "target.tabIndex = -1",
  "const prepareAfterRender = () =>",
  "new MutationObserver(prepareAfterRender)",
  "observer.observe(boundary, {",
  "childList: true",
  "subtree: true",
  "prepareAfterRender();",
  "observer.disconnect();",
  "window.requestAnimationFrame",
  "window.cancelAnimationFrame",
]) {
  expect(source.includes(fragment), `Reconciliação B123 perdeu a garantia: ${fragment}`);
}

expect(
  !/observer\.observe\([\s\S]*?attributes:\s*true/.test(source),
  "O observer B123 não pode observar atributos modificados pela própria reconciliação.",
);
expect(
  /return \(\) => \{[\s\S]*?observer\.disconnect\(\);[\s\S]*?window\.cancelAnimationFrame\(frame\);[\s\S]*?\};/s.test(
    source,
  ),
  "O cleanup B123 deve desconectar o observer e cancelar o frame pendente.",
);

for (const fragment of [
  "mainContentCount === 1",
  "mainContentIsLandmark === true",
  'mainContentTabIndex === "-1"',
  "skipLinkCount === 1",
  "liveRegionCount >= 1",
]) {
  expect(
    browserRuntime.includes(fragment),
    `Smoke B123 não comprova a reconciliação no navegador: ${fragment}`,
  );
}

for (const fragment of [
  "FASE B123",
  "Suspense",
  "requestAnimationFrame",
  "MutationObserver",
  "childList",
  "subtree",
  "não observa atributos",
  "observer é desconectado",
  "Supabase remoto não foi modificado",
]) {
  expect(documentation.includes(fragment), `Documentação B123 ausente: ${fragment}`);
}

expect(
  parent.includes('await import("./check-route-accessibility-observer.mjs")'),
  "Contrato B123 deve permanecer encadeado ao gate de determinismo do CI.",
);

if (failures.length > 0) {
  console.error(
    "Contrato de reconciliação B123 inválido:\n- " +
      [...new Set(failures)].join("\n- "),
  );
  process.exit(1);
}

console.log(
  "Contrato B123 aprovado: substituições do Suspense reaplicam o landmark por observer limitado, idempotente e limpo.",
);

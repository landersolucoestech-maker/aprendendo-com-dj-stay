import { existsSync, readFileSync } from "node:fs";

const paths = {
  navigation: "src/components/Navigation.tsx",
  runtime: "scripts/run-browser-client-navigation-smoke.mjs",
  networkCheck: "scripts/check-browser-network-isolation.mjs",
  documentation: "docs/refactor/FASE-B135-REAL-NAVIGATION-INTERACTION.md",
  parent: "scripts/check-ci-determinism.mjs",
};
const failures = [];
const read = (path) => (existsSync(path) ? readFileSync(path, "utf8") : "");
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

for (const path of Object.values(paths)) {
  expect(existsSync(path), `Arquivo B135 ausente: ${path}`);
}

const navigation = read(paths.navigation);
const runtime = read(paths.runtime);
const networkCheck = read(paths.networkCheck);
const documentation = read(paths.documentation);
const parent = read(paths.parent);

for (const fragment of [
  '<Link to="/login" onClick={closeMenu}>',
  "Entrar",
]) {
  expect(
    navigation.includes(fragment),
    `Navigation perdeu o controle real B135: ${fragment}`,
  );
}

for (const fragment of [
  'const loginLinkSelector =',
  'nav[aria-label="Navegação principal"] a[href="/login"]',
  "prepareTrustedLoginInteraction",
  "candidate.getBoundingClientRect()",
  'style.display !== "none"',
  'style.visibility !== "hidden"',
  "document.elementFromPoint(x, y)?.closest(selector)",
  'document.addEventListener("click", handleClick)',
  "event.isTrusted",
  "event.defaultPrevented",
  '"Input.dispatchMouseEvent"',
  'type: "mouseMoved"',
  'type: "mousePressed"',
  'type: "mouseReleased"',
  'button: "left"',
  'interaction: "trusted-click"',
  'state.interaction?.isTrusted === true',
  'state.interaction?.text === "Entrar"',
  'state.interaction?.pathname === "/login"',
  '"client-navigation.interaction.json"',
  "O clique real B135 não navegou para /login",
]) {
  expect(runtime.includes(fragment), `Smoke B135 ausente: ${fragment}`);
}

for (const forbidden of [
  "window.history.pushState",
  "PopStateEvent",
  'window.dispatchEvent(new Event("popstate"',
]) {
  expect(
    !runtime.includes(forbidden),
    `Smoke B135 contém navegação artificial proibida: ${forbidden}`,
  );
}

for (const fragment of [
  'const clientNavigationFile = "client-navigation.network.json"',
  "documentRequests.length !== 1",
  "navigationDocumentRequests.length !== 0",
  'entry.phase === "client-navigation"',
  'entry.pathname === "/login"',
]) {
  expect(
    networkCheck.includes(fragment),
    `Isolamento de rede B135 ausente: ${fragment}`,
  );
}

for (const fragment of [
  "FASE B135",
  "`window.history.pushState`",
  "link real `Entrar`",
  "`document.elementFromPoint`",
  "`Input.dispatchMouseEvent`",
  "`event.isTrusted === true`",
  "`client-navigation.interaction.json`",
  "nenhum novo `Document`",
  "Supabase remoto não foi modificado",
  "Nenhuma migration, dependência ou lockfile foi alterado",
]) {
  expect(
    documentation.includes(fragment),
    `Documentação B135 ausente: ${fragment}`,
  );
}

expect(
  parent.includes('await import("./check-real-navigation-interaction.mjs")'),
  "Contrato B135 deve permanecer encadeado ao gate de determinismo do CI.",
);

if (failures.length > 0) {
  console.error(
    "Contrato B135 inválido:\n- " + [...new Set(failures)].join("\n- "),
  );
  process.exit(1);
}

console.log(
  "Contrato B135 aprovado: o link público Entrar é acionado por evento confiável do Chrome, sem mutação artificial do histórico e sem novo Document.",
);
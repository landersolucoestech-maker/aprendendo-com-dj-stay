import { existsSync, readFileSync } from "node:fs";

const paths = {
  package: "package.json",
  exception: "security/react-router-audit-exception.json",
  usageAudit: "scripts/audit-react-router-usage.mjs",
  documentation: "docs/refactor/FASE-B116-REACT-ROUTER-UPGRADE-BOUNDARY.md",
};

const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};
const read = (path) => (existsSync(path) ? readFileSync(path, "utf8") : "");

for (const path of Object.values(paths)) {
  expect(existsSync(path), `Arquivo B116 ausente: ${path}`);
}

const packageJson = existsSync(paths.package)
  ? JSON.parse(read(paths.package))
  : {};
const exception = existsSync(paths.exception)
  ? JSON.parse(read(paths.exception))
  : {};
const usageAudit = read(paths.usageAudit);
const documentation = read(paths.documentation);

expect(
  packageJson.dependencies?.["react-router-dom"] === "^6.30.4",
  "A baseline B116 deve permanecer em react-router-dom@^6.30.4 até a migração coordenada.",
);
expect(
  packageJson.dependencies?.["react-router"] === undefined,
  "react-router não pode ser adicionado diretamente antes da migração coordenada para a linha segura.",
);
expect(
  packageJson.dependencies?.react === "^18.3.1" &&
    packageJson.dependencies?.["react-dom"] === "^18.3.1",
  "A baseline B116 deve preservar React e React DOM 18.3.1.",
);
expect(
  packageJson.engines?.node === ">=22.16.0 <23",
  "A baseline B116 deve preservar o contrato atual de Node até a migração coordenada.",
);

const boundary = exception.upgradeBoundary ?? {};
expect(
  boundary.blockedRange === ">=7.12.0 <8.3.0",
  "O limite B116 deve registrar a faixa bloqueada do React Router.",
);
expect(
  boundary.blockingAdvisory === "GHSA-qwww-vcr4-c8h2",
  "O limite B116 deve registrar o advisory que bloqueia a linha 7.",
);
expect(
  boundary.minimumSafeTarget?.["react-router"] === "8.3.0" &&
    boundary.minimumSafeTarget?.node === "22.22.0" &&
    boundary.minimumSafeTarget?.react === "19.2.7" &&
    boundary.minimumSafeTarget?.["react-dom"] === "19.2.7",
  "O limite B116 deve registrar a primeira baseline coordenada considerada segura.",
);
expect(
  boundary.requiredPackageTransition?.remove === "react-router-dom" &&
    boundary.requiredPackageTransition?.add === "react-router",
  "O limite B116 deve registrar a transição de pacote exigida pela linha 8.",
);
expect(
  exception.allowedAdvisories?.every(
    (advisory) => advisory.id !== boundary.blockingAdvisory,
  ) === true,
  "O advisory high da linha 7 não pode ser absorvido pela exceção moderada atual.",
);
expect(
  exception.upgradeBlocker?.includes("GHSA-qwww-vcr4-c8h2") === true &&
    exception.upgradeBlocker?.includes("8.3.0") === true,
  "A justificativa operacional B116 deve permanecer vinculada ao advisory e à versão corrigida.",
);

for (const fragment of [
  "const prohibitedRouterImportPattern =",
  '"createBrowserRouter"',
  '"RouterProvider"',
  '"HydratedRouter"',
  '"ServerRouter"',
  '"RSCStaticRouter"',
  '"RSCHydratedRouter"',
  'appSource.includes("<BrowserRouter>")',
  'await import("./check-react-router-upgrade-boundary.mjs")',
]) {
  expect(
    usageAudit.includes(fragment),
    `Inventário declarativo exigido pela B116 perdeu a garantia: ${fragment}`,
  );
}

for (const fragment of [
  "FASE B116",
  "GHSA-qwww-vcr4-c8h2",
  "`react-router@8.3.0`",
  "Node 22.22",
  "React e React DOM 19.2.7",
  "Nenhuma migration",
  "Supabase remoto não foi modificado",
  "branch `main` não foi alterada",
  "Nenhuma dependência ou lockfile foi alterado",
]) {
  expect(documentation.includes(fragment), `Documentação B116 ausente: ${fragment}`);
}

expect(
  !existsSync(".github/workflows/b116-react-router-migration.yml"),
  "Workflow temporário de migração B116 não pode permanecer versionado.",
);

if (failures.length > 0) {
  console.error("Contrato B116 inválido:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(
  "Contrato B116 aprovado: a linha 7 permanece bloqueada e a futura migração para React Router 8 exige baseline coordenada de runtime, React e imports.",
);

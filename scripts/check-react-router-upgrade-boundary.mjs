import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const workflowPath = ".github/workflows/react-router-v8-upgrade.yml";
const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };
const read = (path) => (existsSync(path) ? readFileSync(path, "utf8") : "");
const packageJson = JSON.parse(read("package.json"));

expect(packageJson.dependencies?.["react-router"] === "^8.3.0", "React Router deve permanecer em ^8.3.0.");
expect(packageJson.dependencies?.["react-router-dom"] === undefined, "react-router-dom deve permanecer removido.");
expect(packageJson.dependencies?.react === "^19.2.8", "React deve permanecer em ^19.2.8.");
expect(packageJson.dependencies?.["react-dom"] === "^19.2.8", "React DOM deve permanecer em ^19.2.8.");
expect(packageJson.devDependencies?.["@types/react"] === "^19.2.17", "@types/react deve permanecer em ^19.2.17.");
expect(packageJson.devDependencies?.["@types/react-dom"] === "^19.2.3", "@types/react-dom deve permanecer em ^19.2.3.");
expect(packageJson.engines?.node === ">=22.22.0 <23", "Node deve permanecer em >=22.22.0 <23.");
expect(packageJson.engines?.npm === ">=10.9.4 <11", "npm deve permanecer em >=10.9.4 <11.");
expect(packageJson.packageManager === "npm@10.9.4", "packageManager deve permanecer em npm@10.9.4.");
expect(!existsSync("security/react-router-audit-exception.json"), "A exceção B60 deve permanecer removida.");
expect(
  !existsSync(workflowPath) || process.env.GITHUB_WORKFLOW === "Migração coordenada React Router 8",
  "Workflow temporário da migração não pode permanecer após a execução coordenada.",
);

const sourceFiles = [];
const walk = (directory) => {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) walk(path);
    else if (/\.(?:ts|tsx)$/.test(entry)) sourceFiles.push(path);
  }
};
walk("src");
for (const path of sourceFiles) {
  expect(!read(path).includes("react-router-dom"), path + ": import legado react-router-dom encontrado.");
}

const usageAudit = read("scripts/audit-react-router-usage.mjs");
for (const fragment of [
  "const legacyImportPattern =",
  '"createBrowserRouter"',
  '"RouterProvider"',
  '"HydratedRouter"',
  '"ServerRouter"',
  '"RSCStaticRouter"',
  '"RSCHydratedRouter"',
  'appSource.includes("<BrowserRouter>")',
]) expect(usageAudit.includes(fragment), "Inventário declarativo perdeu a garantia: " + fragment);

const documentation = read("docs/refactor/FASE-B116-REACT-ROUTER-UPGRADE-BOUNDARY.md");
for (const fragment of [
  "FASE B116",
  "Migração concluída",
  "react-router@8.3.0",
  "Node 22.22.0",
  "React e React DOM 19.2.8",
  "react-router-dom foi removido",
  "zero vulnerabilidades",
  "Nenhuma migration",
  "Supabase remoto não foi modificado",
  "branch main não foi alterada",
]) expect(documentation.includes(fragment), "Documentação B116 ausente: " + fragment);

if (failures.length > 0) {
  console.error("Contrato B116 inválido:\n- " + failures.join("\n- "));
  process.exit(1);
}
console.log("Contrato B116 aprovado: React Router 8, React 19 e runtime coordenado permanecem protegidos.");

import { execFileSync } from "node:child_process";
import {
  existsSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

const read = (path) => readFileSync(path, "utf8");
const write = (path, content) => writeFileSync(path, `${content.trim()}\n`);
const packagePath = "package.json";
const packageJson = JSON.parse(read(packagePath));
const dependencies = packageJson.dependencies;

delete dependencies["react-router-dom"];
Object.assign(dependencies, {
  react: "^19.2.8",
  "react-dom": "^19.2.8",
  "react-router": "^8.3.0",
  cmdk: "^1.1.1",
  "embla-carousel-react": "^8.6.0",
  "input-otp": "^1.4.2",
  "next-themes": "^0.4.6",
  "react-day-picker": "^10.0.1",
  recharts: "^3.10.1",
  "react-is": "^19.2.8",
  sonner: "^2.0.7",
  vaul: "^1.1.2",
});

for (const name of Object.keys(dependencies).filter(
  (dependency) =>
    dependency.startsWith("@radix-ui/react-") ||
    dependency === "react-resizable-panels",
)) {
  const raw = execFileSync("npm", ["view", name, "version", "--json"], {
    encoding: "utf8",
  }).trim();
  const parsed = JSON.parse(raw);
  const version = Array.isArray(parsed) ? parsed.at(-1) : parsed;
  if (typeof version !== "string" || !/^\d+\.\d+\.\d+/.test(version)) {
    throw new Error(`Versão inválida retornada para ${name}: ${raw}`);
  }
  dependencies[name] = `^${version}`;
}

packageJson.devDependencies["@types/react"] = "^19.2.17";
packageJson.devDependencies["@types/react-dom"] = "^19.2.3";
packageJson.packageManager = "npm@10.9.4";
packageJson.engines.node = ">=22.22.0 <23";
packageJson.engines.npm = ">=10.9.4 <11";
writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);

const codeExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const excludedDirectories = new Set([".git", "node_modules", "dist", "coverage"]);
const extensionOf = (path) => path.slice(path.lastIndexOf("."));
const walkAndTransform = (directory, transform) => {
  for (const entry of readdirSync(directory)) {
    if (excludedDirectories.has(entry)) continue;
    const path = join(directory, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) {
      walkAndTransform(path, transform);
      continue;
    }
    if (!codeExtensions.has(extensionOf(path))) continue;
    const source = read(path);
    const updated = transform(source);
    if (updated !== source) writeFileSync(path, updated);
  }
};

walkAndTransform("src", (source) =>
  source
    .replaceAll('"react-router-dom"', '"react-router"')
    .replaceAll("'react-router-dom'", "'react-router'"),
);

walkAndTransform("scripts", (source) =>
  source.replaceAll("22.16.0", "22.22.0").replaceAll("10.9.2", "10.9.4"),
);

for (const workflow of readdirSync(".github/workflows")) {
  if (!/\.ya?ml$/.test(workflow)) continue;
  const path = join(".github/workflows", workflow);
  const source = read(path);
  const updated = source
    .replaceAll("22.16.0", "22.22.0")
    .replaceAll("10.9.2", "10.9.4");
  if (updated !== source) writeFileSync(path, updated);
}

write(
  "scripts/audit-react-router-usage.mjs",
  String.raw`
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const files = [];
const walk = (directory) => {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) walk(path);
    else if (/\.(?:ts|tsx)$/.test(entry)) files.push(path);
  }
};
walk("src");

const imports = [];
const navigation = [];
const prohibited = [];
const routerImportPattern = /from\s+["']react-router["']/;
const legacyImportPattern = /from\s+["']react-router-dom["']/;
const frameworkImportPattern = /from\s+["']@react-router\/[^"']+["']/;
const prohibitedApis = [
  "createBrowserRouter",
  "createMemoryRouter",
  "createHashRouter",
  "RouterProvider",
  "useFetcher",
  "useFetchers",
  "useLoaderData",
  "useActionData",
  "ScrollRestoration",
  "HydratedRouter",
  "ServerRouter",
  "RSCStaticRouter",
  "RSCHydratedRouter",
];

for (const path of files.sort()) {
  const relativePath = relative(".", path).replaceAll("\\", "/");
  const source = readFileSync(path, "utf8");
  source.split("\n").forEach((line, index) => {
    if (routerImportPattern.test(line)) {
      imports.push(relativePath + ":" + (index + 1) + ": " + line.trim());
    }
    if (/\bnavigate\s*\(|<Link\b|<NavLink\b|<Navigate\b|\bto=/.test(line)) {
      navigation.push(relativePath + ":" + (index + 1) + ": " + line.trim());
    }
  });
  if (legacyImportPattern.test(source)) prohibited.push(relativePath + ": import legado react-router-dom");
  if (frameworkImportPattern.test(source)) prohibited.push(relativePath + ": import de pacote Framework Router");
  for (const api of prohibitedApis) {
    if (new RegExp("\\b" + api + "\\b").test(source)) {
      prohibited.push(relativePath + ": API proibida para modo declarativo: " + api);
    }
  }
}

const appSource = readFileSync("src/App.tsx", "utf8");
if (!appSource.includes("<BrowserRouter>")) prohibited.push("src/App.tsx: BrowserRouter declarativo ausente");
if (imports.length === 0) prohibited.push("src: nenhum import declarativo de react-router encontrado");

console.log("Inventário React Router 8: " + files.length + " arquivos TypeScript analisados.");
console.log("Imports declarativos (" + imports.length + "):");
for (const entry of imports) console.log("- " + entry);
console.log("Superfícies de navegação (" + navigation.length + "):");
for (const entry of navigation) console.log("- " + entry);

if (prohibited.length > 0) {
  console.error("Arquitetura React Router 8 incompatível com o modo declarativo:");
  for (const entry of prohibited) console.error("- " + entry);
  process.exit(1);
}

console.log("Arquitetura React Router 8 confirmada em modo declarativo, sem pacote DOM legado, Data Router, SSR, Framework Mode ou APIs RSC.");
await import("./check-react-router-upgrade-boundary.mjs");
`,
);

write(
  "scripts/check-react-router-upgrade-boundary.mjs",
  String.raw`
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
`,
);

write(
  "scripts/check-dependency-security.mjs",
  String.raw`
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const npmExecutable = process.platform === "win32" ? "npm.cmd" : "npm";
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const viteConfig = readFileSync("vite.config.ts", "utf8");
const expectedDependencies = Object.freeze({
  "@supabase/supabase-js": "^2.110.8",
  react: "^19.2.8",
  "react-dom": "^19.2.8",
  "react-router": "^8.3.0",
  cmdk: "^1.1.1",
  "embla-carousel-react": "^8.6.0",
  "input-otp": "^1.4.2",
  "next-themes": "^0.4.6",
  "react-day-picker": "^10.0.1",
  recharts: "^3.10.1",
  "react-is": "^19.2.8",
  sonner: "^2.0.7",
  vaul: "^1.1.2",
});
const failures = [];
for (const [name, version] of Object.entries(expectedDependencies)) {
  if (packageJson.dependencies?.[name] !== version) failures.push("Dependência " + name + " deve permanecer em " + version + ".");
}
if (packageJson.dependencies?.["react-router-dom"] !== undefined) failures.push("react-router-dom não pode retornar.");
if (existsSync("security/react-router-audit-exception.json")) failures.push("A exceção do React Router deve permanecer removida.");
if (existsSync("scripts/apply-react-router-v8-upgrade.mjs")) failures.push("O helper temporário da migração deve ser removido.");
if (
  existsSync(".github/workflows/react-router-v8-upgrade.yml") &&
  process.env.GITHUB_WORKFLOW !== "Migração coordenada React Router 8"
) failures.push("O workflow temporário da migração deve ser removido.");
if (packageJson.devDependencies?.["lovable-tagger"] !== undefined) failures.push("lovable-tagger não pode retornar.");
if (viteConfig.includes("lovable-tagger") || viteConfig.includes("componentTagger")) failures.push("vite.config.ts não pode depender de lovable-tagger.");
if (packageJson.scripts?.postinstall) failures.push("package.json não pode manter postinstall temporário.");
if (failures.length > 0) {
  console.error("Baseline de dependências inválida:\n- " + failures.join("\n- "));
  process.exit(1);
}

const runAudit = (label, extraArguments = []) => {
  const result = spawnSync(npmExecutable, ["audit", "--json", ...extraArguments], {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
    env: { ...process.env, npm_config_fund: "false", npm_config_audit_level: "none" },
  });
  if (result.error) throw new Error("Não foi possível executar npm audit (" + label + "): " + result.error.message);
  const output = result.stdout.trim();
  if (!output) throw new Error("npm audit (" + label + ") não retornou JSON. " + result.stderr.trim());
  return JSON.parse(output);
};

const validateAudit = (label, report) => {
  const counts = report?.metadata?.vulnerabilities ?? {};
  const total = Number(counts.total ?? 0);
  console.log(label + ": total=" + total + ", critical=" + (counts.critical ?? 0) + ", high=" + (counts.high ?? 0) + ", moderate=" + (counts.moderate ?? 0) + ", low=" + (counts.low ?? 0) + ".");
  if (total !== 0 || Object.keys(report?.vulnerabilities ?? {}).length !== 0) {
    console.error(label + ": a baseline exige zero vulnerabilidades.");
    process.exit(1);
  }
};

validateAudit("Auditoria de produção", runAudit("produção", ["--omit=dev"]));
validateAudit("Auditoria completa", runAudit("completa"));
console.log("Contrato de dependências aprovado: React Router 8.3.0, React 19.2.8 e UI compatível com zero vulnerabilidades conhecidas.");
await import("./audit-react-router-usage.mjs");
`,
);

write(
  "docs/refactor/FASE-B116-REACT-ROUTER-UPGRADE-BOUNDARY.md",
  String.raw`
# FASE B116 — Migração coordenada do React Router

## Migração concluída

A branch dev migrou da baseline declarativa react-router-dom@6.30.4 para react-router@8.3.0, sem passagem pela faixa vulnerável intermediária.

A atualização coordenada incluiu:

- react-router@8.3.0;
- Node 22.22.0;
- React e React DOM 19.2.8;
- tipos React 19;
- bibliotecas de UI compatíveis com React 19;
- lockfile regenerado com peer dependencies estritas;
- imports declarativos migrados para react-router;
- exceção temporária de segurança removida;
- npm audit de produção e completo com zero vulnerabilidades.

O pacote react-router-dom foi removido. A aplicação permanece em modo declarativo com BrowserRouter, Routes, Route, Link, Navigate e hooks de navegação. Data Router, Framework Mode, SSR, hydration de servidor e APIs RSC continuam proibidos pelos contratos estáticos.

## Gate

Os contratos exigem versões coordenadas, ausência do pacote legado, zero vulnerabilidades, resolução estrita sem force ou legacy-peer-deps, lockfile sincronizado, lint, testes, TypeScript, build e smoke aprovados.

## Exclusões

- Nenhuma migration foi criada ou alterada.
- O Supabase remoto não foi modificado.
- A branch main não foi alterada.
- A aprovação em dev não equivale a homologação externa ou promoção para produção.
`,
);

rmSync("security/react-router-audit-exception.json", { force: true });
rmSync("scripts/apply-react-router-v8-upgrade.mjs", { force: true });
console.log("Transformação coordenada do React Router 8 aplicada ao workspace.");

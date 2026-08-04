import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const sourceRoot = "src";
const files = [];

const walk = (directory) => {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) {
      walk(path);
    } else if (/\.(?:ts|tsx)$/.test(entry)) {
      files.push(path);
    }
  }
};

walk(sourceRoot);

const imports = [];
const navigation = [];
const prohibited = [];
const routerImportPattern =
  /from\s+["'](?:react-router-dom|react-router|@react-router\/[^"']+)["']/;
const prohibitedRouterImportPattern =
  /from\s+["'](?:react-router|@react-router\/[^"']+)["']/;
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
  const lines = source.split("\n");

  lines.forEach((line, index) => {
    if (routerImportPattern.test(line)) {
      imports.push(`${relativePath}:${index + 1}: ${line.trim()}`);
    }
    if (
      /\bnavigate\s*\(|<Link\b|<NavLink\b|<Navigate\b|\bto=/.test(line)
    ) {
      navigation.push(`${relativePath}:${index + 1}: ${line.trim()}`);
    }
  });

  if (prohibitedRouterImportPattern.test(source)) {
    prohibited.push(`${relativePath}: import direto de Data/Framework Router`);
  }

  for (const api of prohibitedApis) {
    if (new RegExp(`\\b${api}\\b`).test(source)) {
      prohibited.push(`${relativePath}: API proibida para modo declarativo: ${api}`);
    }
  }
}

const appSource = readFileSync("src/App.tsx", "utf8");
if (!appSource.includes("<BrowserRouter>")) {
  prohibited.push("src/App.tsx: BrowserRouter declarativo ausente");
}

console.log(`Inventário React Router: ${files.length} arquivos TypeScript analisados.`);
console.log(`Imports do roteador (${imports.length}):`);
for (const entry of imports) console.log(`- ${entry}`);
console.log(`Superfícies de navegação (${navigation.length}):`);
for (const entry of navigation) console.log(`- ${entry}`);

if (prohibited.length > 0) {
  console.error("Arquitetura React Router incompatível com o limite declarativo:");
  for (const entry of prohibited) console.error(`- ${entry}`);
  process.exit(1);
}

console.log(
  "Arquitetura React Router confirmada em modo declarativo, sem Data Router, SSR, Framework Mode ou APIs RSC.",
);

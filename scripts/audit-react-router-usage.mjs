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

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "artifacts", "frontend-wave0");
mkdirSync(path.join(OUT_DIR, "logs"), { recursive: true });

const BASELINE_SHA = process.env.WAVE0_BASELINE_SHA || "292a2a51d95a2f6f35d6c4255df780aa00fa2e51";
const EXPECTED_ROUTES = 54;
const EXPECTED_EXPLICIT_ROUTES = 53;
const ALLOWED_BOOTSTRAP_FILES = [
  ".github/workflows/frontend-wave0-bootstrap.yml",
  "scripts/frontend-wave0-manifest.mjs",
];
const VALID_DISPOSITIONS = new Set([
  "KEEP",
  "KEEP_AND_REFACTOR",
  "REIMPLEMENT",
  "MERGE_INTO_MODULE",
  "SPLIT",
  "REMOVE_AFTER_REPLACEMENT",
  "NEEDS_INVESTIGATION",
]);

function git(args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function trackedFiles() {
  const raw = execFileSync("git", ["ls-files", "-z"], { cwd: ROOT });
  return raw
    .toString("utf8")
    .split("\0")
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

function isFrontendScope(file) {
  if (file.startsWith("src/") || file.startsWith("public/")) return true;
  if (["index.html", "components.json", "package.json", "package-lock.json"].includes(file)) return true;
  if (/^(vite|vitest|tailwind|postcss)\.config\.[^/]+$/i.test(file)) return true;
  if (/^tsconfig(?:\.[^/]+)?$/i.test(file) || /^tsconfig[^/]*\.json$/i.test(file)) return true;
  if (/^(?:eslint(?:\.config)?|\.eslint)[^/]*$/i.test(file)) return true;
  if (file.startsWith("scripts/")) {
    return /(frontend|visual|build|browser|design-system|accessibility|student-navigation|student-page-frame)/i.test(file);
  }
  return false;
}

function fileType(file) {
  const ext = path.extname(file).toLowerCase();
  const map = {
    ".ts": "typescript",
    ".tsx": "typescript-react",
    ".js": "javascript",
    ".jsx": "javascript-react",
    ".mjs": "javascript-module",
    ".cjs": "commonjs",
    ".json": "json",
    ".css": "css",
    ".html": "html",
    ".svg": "svg",
    ".png": "png",
    ".jpg": "jpeg",
    ".jpeg": "jpeg",
    ".webp": "webp",
    ".ico": "icon",
    ".md": "markdown",
    ".yml": "yaml",
    ".yaml": "yaml",
  };
  return { extension: ext || "", type: map[ext] || (ext ? ext.slice(1) : "no-extension") };
}

function domainCandidate(file) {
  if (file.startsWith("public/")) return "public-assets";
  if (file.startsWith("scripts/")) return "frontend-tooling";
  if (!file.startsWith("src/")) return "frontend-config";

  const segments = file.split("/");
  const lower = file.toLowerCase();
  const known = [
    ["/admin/", "admin"],
    ["/affiliate", "affiliate"],
    ["/student", "student"],
    ["/auth/", "auth"],
    ["/routing/", "app-routing"],
    ["/accessibility/", "accessibility"],
    ["/integrations/supabase/", "supabase-adapter"],
    ["/components/ui/", "shared-ui-candidate"],
    ["/components/", "shared-component-candidate"],
    ["/pages/", "page-domain-candidate"],
    ["/hooks/", "hooks"],
    ["/contracts/", "contracts"],
    ["/lib/", "lib"],
    ["/test", "tests"],
  ];
  for (const [needle, domain] of known) {
    if (lower.includes(needle)) return domain;
  }
  return segments[1] ? `src-${segments[1]}` : "src-root";
}

function isTestFile(file) {
  return /(?:^|\/)(?:__tests__|tests?)(?:\/|$)|\.(?:test|spec)\.[^/]+$/i.test(file);
}

function writeJson(name, value) {
  writeFileSync(path.join(OUT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

const allTracked = trackedFiles();
const scopedPaths = allTracked.filter(isFrontendScope);
const manifest = scopedPaths.map((file) => {
  const absolute = path.join(ROOT, file);
  const { extension, type } = fileType(file);
  return {
    path: file,
    size: statSync(absolute).size,
    extension,
    type,
    domainCandidate: domainCandidate(file),
    isTest: isTestFile(file),
    disposition: "NEEDS_INVESTIGATION",
    v2Destination: "-",
    importers: [],
    dependencyAnalysis: "NOT_PERFORMED",
  };
});

const pathCounts = new Map();
for (const entry of manifest) pathCounts.set(entry.path, (pathCounts.get(entry.path) || 0) + 1);
const duplicatePaths = [...pathCounts.entries()].filter(([, count]) => count !== 1).map(([file]) => file);
const manifestPaths = new Set(manifest.map((entry) => entry.path));
const missingPaths = scopedPaths.filter((file) => !manifestPaths.has(file));
const unexpectedPaths = manifest.map((entry) => entry.path).filter((file) => !scopedPaths.includes(file));
const unclassified = manifest.filter((entry) => !VALID_DISPOSITIONS.has(entry.disposition));

const domainCounts = Object.fromEntries(
  [...manifest.reduce((map, entry) => map.set(entry.domainCandidate, (map.get(entry.domainCandidate) || 0) + 1), new Map())]
    .sort(([a], [b]) => a.localeCompare(b)),
);
const dispositionCounts = Object.fromEntries(
  [...manifest.reduce((map, entry) => map.set(entry.disposition, (map.get(entry.disposition) || 0) + 1), new Map())]
    .sort(([a], [b]) => a.localeCompare(b)),
);

const appSource = readFileSync(path.join(ROOT, "src", "App.tsx"), "utf8");
const routeOpenings = [...appSource.matchAll(/<Route\b/g)].map((match) => match.index ?? 0);
const routePaths = routeOpenings.map((index) => {
  const end = appSource.indexOf(">", index);
  const opening = appSource.slice(index, end === -1 ? appSource.length : end + 1);
  return opening.match(/\bpath="([^"]+)"/)?.[1] ?? null;
});
const fallbackRoutes = routePaths.filter((route) => route === "*").length;
const explicitRoutes = routePaths.filter((route) => route && route !== "*").length;

let routeDiff = "";
try {
  routeDiff = git(["diff", "--name-only", `${BASELINE_SHA}..HEAD`, "--", "src/App.tsx", "src/routing"]);
} catch {
  routeDiff = "DIFF_CHECK_FAILED";
}
const changedRouteFiles = routeDiff ? routeDiff.split("\n").filter(Boolean) : [];

const currentHead = git(["rev-parse", "HEAD"]);
const currentBranch = git(["branch", "--show-current"]);
const origin = git(["remote", "get-url", "origin"]);
const initialStatus = git(["status", "--short", "--untracked-files=no"]);
let bootstrapCommitFiles = [];
try {
  bootstrapCommitFiles = git(["diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD"])
    .split("\n")
    .filter(Boolean)
    .sort();
} catch {
  bootstrapCommitFiles = [];
}
const bootstrapCommitFilesValid =
  process.env.WAVE0_BOOTSTRAP_EVENT !== "push" ||
  (bootstrapCommitFiles.length === ALLOWED_BOOTSTRAP_FILES.length &&
    ALLOWED_BOOTSTRAP_FILES.every((file) => bootstrapCommitFiles.includes(file)));

const summary = {
  generatedAt: new Date().toISOString(),
  authoritativeSource: "git ls-files",
  branch: currentBranch,
  head: currentHead,
  origin,
  trackedFilesRepositoryWide: allTracked.length,
  totalFiles: manifest.length,
  classifiedFiles: manifest.length - unclassified.length,
  unclassifiedFiles: unclassified.length,
  duplicatePaths: duplicatePaths.length,
  missingPaths: missingPaths.length,
  unexpectedPaths: unexpectedPaths.length,
  domainCounts,
  dispositionCounts,
  routes: {
    totalRouteRegistrations: routeOpenings.length,
    expected: EXPECTED_ROUTES,
    explicitNamedPatterns: explicitRoutes,
    expectedExplicitNamedPatterns: EXPECTED_EXPLICIT_ROUTES,
    fallbackRoutes,
    changedRouteFiles,
    pathsChanged: changedRouteFiles.includes("src/App.tsx") ? 1 : 0,
    guardsChanged: changedRouteFiles.filter((file) => file.startsWith("src/routing/")).length,
    redirectsChanged: changedRouteFiles.filter((file) => file.startsWith("src/routing/") || file === "src/App.tsx").length,
  },
  bootstrapCommitFiles,
  bootstrapCommitFilesValid,
  trackedWorkingTreeStatus: initialStatus || "CLEAN",
};

writeJson("frontend-physical-manifest.json", manifest);
writeJson("manifest-summary.json", summary);

const manifestMd = [
  "# Frontend Wave 0 — Physical Manifest",
  "",
  `Generated from authoritative source: \`git ls-files\``,
  `Branch: \`${currentBranch}\``,
  `HEAD: \`${currentHead}\``,
  "",
  `TOTAL_FILES: ${summary.totalFiles}`,
  `CLASSIFIED_FILES: ${summary.classifiedFiles}`,
  `UNCLASSIFIED_FILES: ${summary.unclassifiedFiles}`,
  `DUPLICATE_PATHS: ${summary.duplicatePaths}`,
  `MISSING_PATHS: ${summary.missingPaths}`,
  "",
  "| Path | Size | Type | Domain candidate | Test | Disposition | V2 destination |",
  "|---|---:|---|---|---|---|---|",
  ...manifest.map((entry) =>
    `| \`${entry.path.replaceAll("|", "\\|")}\` | ${entry.size} | ${entry.type} | ${entry.domainCandidate} | ${entry.isTest ? "SIM" : "NÃO"} | ${entry.disposition} | ${entry.v2Destination} |`,
  ),
  "",
].join("\n");
writeFileSync(path.join(OUT_DIR, "frontend-physical-manifest.md"), manifestMd, "utf8");

const manifestPass =
  summary.totalFiles > 0 &&
  summary.classifiedFiles === summary.totalFiles &&
  summary.unclassifiedFiles === 0 &&
  summary.duplicatePaths === 0 &&
  summary.missingPaths === 0 &&
  summary.unexpectedPaths === 0;
const routesPass =
  routeOpenings.length === EXPECTED_ROUTES &&
  explicitRoutes === EXPECTED_EXPLICIT_ROUTES &&
  fallbackRoutes === 1 &&
  changedRouteFiles.length === 0;

const report = [
  "# Wave 0 Bootstrap Validation Report",
  "",
  `- authoritative enumeration: \`git ls-files\``,
  `- branch: \`${currentBranch}\``,
  `- HEAD: \`${currentHead}\``,
  `- origin: \`${origin}\``,
  `- repository tracked files: **${allTracked.length}**`,
  `- frontend scope files: **${summary.totalFiles}**`,
  `- classified files: **${summary.classifiedFiles}**`,
  `- unclassified files: **${summary.unclassifiedFiles}**`,
  `- duplicate paths: **${summary.duplicatePaths}**`,
  `- missing scoped paths: **${summary.missingPaths}**`,
  `- manifest integrity: **${manifestPass ? "PASS" : "FAIL"}**`,
  `- route registrations: **${routeOpenings.length}/${EXPECTED_ROUTES}**`,
  `- explicit route patterns: **${explicitRoutes}/${EXPECTED_EXPLICIT_ROUTES}**`,
  `- catch-all routes: **${fallbackRoutes}/1**`,
  `- changed route files vs baseline: **${changedRouteFiles.length}**`,
  `- paths changed: **${summary.routes.pathsChanged}**`,
  `- guards changed: **${summary.routes.guardsChanged}**`,
  `- redirects changed: **${summary.routes.redirectsChanged}**`,
  `- routes invariant: **${routesPass ? "PASS" : "FAIL"}**`,
  `- bootstrap commit file boundary: **${bootstrapCommitFilesValid ? "PASS" : "FAIL"}**`,
  `- tracked working tree at enumeration: **${initialStatus ? "DIRTY" : "CLEAN"}**`,
  "",
  "## Quality gates",
  "",
  "Quality gate outcomes are appended by the workflow after npm execution.",
  "",
].join("\n");
writeFileSync(path.join(OUT_DIR, "validation-report.md"), report, "utf8");

console.log(`TOTAL_FILES=${summary.totalFiles}`);
console.log(`CLASSIFIED_FILES=${summary.classifiedFiles}`);
console.log(`UNCLASSIFIED_FILES=${summary.unclassifiedFiles}`);
console.log(`DUPLICATE_PATHS=${summary.duplicatePaths}`);
console.log(`TOTAL_ROUTE_REGISTRATIONS=${routeOpenings.length}`);
console.log(`EXPLICIT_ROUTE_PATTERNS=${explicitRoutes}`);
console.log(`FALLBACK_ROUTES=${fallbackRoutes}`);

if (!manifestPass) {
  console.error("Manifest integrity validation failed.");
  process.exitCode = 1;
}
if (!routesPass) {
  console.error("Route invariance validation failed.");
  process.exitCode = 1;
}
if (!bootstrapCommitFilesValid) {
  console.error(`Bootstrap commit changed files outside the allowed boundary: ${bootstrapCommitFiles.join(", ")}`);
  process.exitCode = 1;
}

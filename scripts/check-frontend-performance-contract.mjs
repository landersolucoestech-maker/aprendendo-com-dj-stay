import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const read = (relativePath) => readFile(path.join(root, relativePath), "utf8");

const lazyDomainFiles = [
  "src/routing/lazy/public-pages.ts",
  "src/routing/lazy/auth-pages.ts",
  "src/routing/lazy/student-pages.ts",
  "src/routing/lazy/commerce-pages.ts",
  "src/routing/lazy/affiliate-pages.ts",
  "src/routing/lazy/admin-pages.ts",
];

const requiredFiles = [
  "src/App.tsx",
  "src/lib/query-client.ts",
  "src/routing/RouteErrorBoundary.tsx",
  "src/routing/RouteLoadingFallback.tsx",
  "vite.config.ts",
  "scripts/check-build-chunks.mjs",
  "package.json",
  ...lazyDomainFiles,
];

const contents = new Map(
  await Promise.all(requiredFiles.map(async (file) => [file, await read(file)])),
);

const fail = (message) => {
  console.error(`FASE B25 bloqueada: ${message}`);
  process.exitCode = 1;
};

const requireText = (file, fragments) => {
  const content = contents.get(file) ?? "";
  for (const fragment of fragments) {
    if (!content.includes(fragment)) fail(`${file} não contém ${fragment}`);
  }
};

const forbidText = (file, fragments) => {
  const content = contents.get(file) ?? "";
  for (const fragment of fragments) {
    if (content.includes(fragment)) fail(`${file} ainda contém ${fragment}`);
  }
};

requireText("src/App.tsx", [
  'import { Suspense } from "react"',
  'import { RouteErrorBoundary } from "@/routing/RouteErrorBoundary"',
  'import { RouteLoadingFallback } from "@/routing/RouteLoadingFallback"',
  "<RouteErrorBoundary>",
  '<Suspense fallback={<RouteLoadingFallback />}>',
  "</Suspense>",
  "</RouteErrorBoundary>",
  'from "@/routing/lazy/public-pages"',
  'from "@/routing/lazy/auth-pages"',
  'from "@/routing/lazy/student-pages"',
  'from "@/routing/lazy/commerce-pages"',
  'from "@/routing/lazy/affiliate-pages"',
  'from "@/routing/lazy/admin-pages"',
]);
forbidText("src/App.tsx", ['from "@/pages/']);

let lazyImportCount = 0;
for (const file of lazyDomainFiles) {
  const content = contents.get(file) ?? "";
  requireText(file, ['import { lazy } from "react"', 'import("@/pages/']);
  lazyImportCount += (content.match(/\blazy\s*\(/g) ?? []).length;
}
if (lazyImportCount < 25) {
  fail(`os registros por domínio possuem somente ${lazyImportCount} imports lazy; eram esperados ao menos 25`);
}

requireText("src/routing/RouteLoadingFallback.tsx", [
  'aria-busy="true"',
  'role="status"',
  'aria-live="polite"',
  "Carregando conteúdo...",
]);

requireText("src/routing/RouteErrorBoundary.tsx", [
  "class RouteErrorBoundaryBase extends Component",
  "override state:",
  "static getDerivedStateFromError",
  "override componentDidCatch",
  "override componentDidUpdate",
  "override render",
  "previousProps.resetKey !== this.props.resetKey",
  'role="alert"',
  "window.location.reload()",
  "useLocation()",
]);

requireText("src/lib/query-client.ts", [
  "staleTime: 60_000",
  "gcTime: 10 * 60_000",
  "retry: shouldRetryQuery",
  "failureCount >= 1",
  "status === 408 || status === 429 || status >= 500",
  "retryDelay: 1_000",
  "refetchOnWindowFocus: false",
  "refetchOnReconnect: true",
  'networkMode: "online"',
  "structuralSharing: true",
  "retry: false",
]);

requireText("vite.config.ts", [
  "const manualChunks =",
  'return "vendor-react"',
  'return "vendor-query"',
  'return "vendor-supabase"',
  'return "vendor-radix"',
  'return "vendor-charts"',
  'return "vendor-forms"',
  'return "vendor-ui"',
  'return "vendor-misc"',
  "cssCodeSplit: true",
  "chunkSizeWarningLimit: 500",
  "manualChunks,",
]);
forbidText("vite.config.ts", ["chunkSizeWarningLimit: 1000", "chunkSizeWarningLimit: 2000"]);

requireText("scripts/check-build-chunks.mjs", [
  "const maximumChunkBytes = 500 * 1024",
  "const minimumChunkCount = 8",
  "oversizedChunks",
  "process.exit(1)",
  "Gate de chunks aprovado",
]);

requireText("package.json", [
  '"check:frontend-performance": "node scripts/check-frontend-performance-contract.mjs"',
  '"check:build-chunks": "node scripts/check-build-chunks.mjs"',
  '"build": "vite build && npm run check:build-chunks"',
  '"build:dev": "vite build --mode development && npm run check:build-chunks"',
  "npm run check:frontend-performance",
]);

if (process.exitCode) process.exit(process.exitCode);
console.log(
  `Contrato estático da FASE B25 aprovado com ${lazyImportCount} superfícies lazy.`,
);

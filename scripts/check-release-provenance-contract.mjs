import { existsSync, readFileSync } from "node:fs";

const requiredFiles = [
  "vite.config.ts",
  "src/vite-env.d.ts",
  "src/observability/frontend-error-reporting.ts",
  "scripts/check-release-artifact.mjs",
  "docs/refactor/FASE-B34-RELEASE-PROVENANCE.md",
  "package.json",
];
const failures = [];

for (const file of requiredFiles) {
  if (!existsSync(file)) failures.push(`Arquivo B34 ausente: ${file}`);
}

if (failures.length === 0) {
  const viteConfig = readFileSync("vite.config.ts", "utf8");
  const viteEnvironment = readFileSync("src/vite-env.d.ts", "utf8");
  const reporting = readFileSync(
    "src/observability/frontend-error-reporting.ts",
    "utf8",
  );
  const artifactGate = readFileSync(
    "scripts/check-release-artifact.mjs",
    "utf8",
  );
  const packageJson = readFileSync("package.json", "utf8");

  for (const fragment of [
    "resolveRelease",
    "VITE_APP_RELEASE",
    "GITHUB_SHA",
    'execFileSync("git", ["rev-parse", "HEAD"]',
    "Build bloqueado: revisão imutável não resolvida",
    "__APP_RELEASE__",
    "__APP_ENVIRONMENT__",
    'fileName: "release.json"',
    "schema_version: 1",
    "generateBundle()",
  ]) {
    if (!viteConfig.includes(fragment)) {
      failures.push(`vite.config.ts não preserva a proveniência B34: ${fragment}`);
    }
  }

  const variableTimestampPatterns = [
    /\bDate\.now\s*\(/,
    /\bnew\s+Date\s*\(/,
    /["']?(?:timestamp|generated_at|generatedAt|built_at|builtAt)["']?\s*:/,
    /\bperformance\.now\s*\(/,
  ];
  if (variableTimestampPatterns.some((pattern) => pattern.test(viteConfig))) {
    failures.push(
      "Manifesto B34 não pode incluir timestamp variável e perder determinismo.",
    );
  }
  if (!viteEnvironment.includes("declare const __APP_RELEASE__: string")) {
    failures.push("Declaração global __APP_RELEASE__ ausente.");
  }
  if (!viteEnvironment.includes("declare const __APP_ENVIRONMENT__: string")) {
    failures.push("Declaração global __APP_ENVIRONMENT__ ausente.");
  }
  if (!reporting.includes("__APP_RELEASE__")) {
    failures.push("Observabilidade B31 não consome a revisão compilada B34.");
  }
  if (reporting.includes("import.meta.env.VITE_APP_RELEASE")) {
    failures.push(
      "Observabilidade não pode resolver release em runtime por variável opcional.",
    );
  }

  for (const fragment of [
    '"dist", "release.json"',
    "resolveExpectedRelease",
    "GITHUB_SHA",
    'execFileSync("git", ["rev-parse", "HEAD"]',
    "releaseEmbeddedInRuntime",
    "release.json não está incorporada ao runtime compilado",
  ]) {
    if (!artifactGate.includes(fragment)) {
      failures.push(`Gate de artefato B34 incompleto: ${fragment}`);
    }
  }

  for (const fragment of [
    '"check:release-provenance": "node scripts/check-release-provenance-contract.mjs"',
    '"check:release-artifact": "node scripts/check-release-artifact.mjs"',
    "npm run check:release-provenance",
    "npm run check:release-artifact",
  ]) {
    if (!packageJson.includes(fragment)) {
      failures.push(`package.json não integra o B34: ${fragment}`);
    }
  }
}

if (failures.length > 0) {
  console.error("Contrato B34 inválido:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(
  "Contrato B34 aprovado: revisão imutável compartilhada por runtime e release.json determinístico.",
);

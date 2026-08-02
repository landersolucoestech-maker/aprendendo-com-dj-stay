import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const npmExecutable = process.platform === "win32" ? "npm.cmd" : "npm";
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const viteConfig = readFileSync("vite.config.ts", "utf8");
const routerException = JSON.parse(
  readFileSync("security/react-router-audit-exception.json", "utf8"),
);

const expectedDependencies = Object.freeze({
  "@supabase/supabase-js": "^2.110.8",
  "react-router-dom": "^6.30.4",
});
const expectedDevDependencies = Object.freeze({
  "@vitejs/plugin-react-swc": "^4.3.2",
  postcss: "^8.5.23",
  "typescript-eslint": "^8.65.0",
  vite: "^6.4.3",
});
const baselineFailures = [];

for (const [name, version] of Object.entries(expectedDependencies)) {
  if (packageJson.dependencies?.[name] !== version) {
    baselineFailures.push(
      `Dependência ${name} deve permanecer em ${version}, encontrada ${
        packageJson.dependencies?.[name] ?? "ausente"
      }.`,
    );
  }
}

for (const [name, version] of Object.entries(expectedDevDependencies)) {
  if (packageJson.devDependencies?.[name] !== version) {
    baselineFailures.push(
      `Dependência de desenvolvimento ${name} deve permanecer em ${version}, encontrada ${
        packageJson.devDependencies?.[name] ?? "ausente"
      }.`,
    );
  }
}

if (
  routerException.packageBaseline?.["react-router-dom"] !==
  expectedDependencies["react-router-dom"]
) {
  baselineFailures.push(
    "Exceção B60 não corresponde à versão canônica de react-router-dom.",
  );
}

const reviewBy = routerException.reviewBy;
if (!/^\d{4}-\d{2}-\d{2}$/.test(reviewBy ?? "")) {
  baselineFailures.push("Exceção B60 não possui reviewBy ISO válido.");
} else if (new Date().toISOString().slice(0, 10) > reviewBy) {
  baselineFailures.push(
    `Exceção B60 expirou em ${reviewBy}; revisão de segurança obrigatória.`,
  );
}

if (packageJson.devDependencies?.["lovable-tagger"] !== undefined) {
  baselineFailures.push(
    "lovable-tagger não pode retornar: sua restrição de peer dependency bloqueia a baseline segura do Vite.",
  );
}

if (
  viteConfig.includes("lovable-tagger") ||
  viteConfig.includes("componentTagger")
) {
  baselineFailures.push(
    "vite.config.ts não pode depender da instrumentação removida lovable-tagger.",
  );
}

if (packageJson.scripts?.postinstall) {
  baselineFailures.push(
    "package.json não pode manter postinstall temporário de migração de dependências.",
  );
}

for (const temporaryPath of [
  "scripts/apply-b27-dependency-update.mjs",
  "scripts/apply-b27-lockfile-repair.mjs",
  "scripts/apply-b27-transitive-audit-fix.mjs",
  "scripts/apply-b27-eslint-alignment.mjs",
  ".github/workflows/b27-lockfile-bootstrap.yml",
  ".github/workflows/b27-eslint-bootstrap.yml",
  ".github/workflows/b60-react-router-lockfile.yml",
  "docs/refactor/.b60-react-router-upgrade",
]) {
  if (existsSync(temporaryPath)) {
    baselineFailures.push(
      `Mecanismo temporário deve ser removido: ${temporaryPath}.`,
    );
  }
}

if (baselineFailures.length > 0) {
  console.error(
    "Baseline B27/B60 inválida:\n- " + baselineFailures.join("\n- "),
  );
  process.exit(1);
}

const emptyCounts = Object.freeze({
  info: 0,
  low: 0,
  moderate: 0,
  high: 0,
  critical: 0,
  total: 0,
});

const runAudit = (label, extraArguments = []) => {
  const result = spawnSync(
    npmExecutable,
    ["audit", "--json", ...extraArguments],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
      env: {
        ...process.env,
        npm_config_fund: "false",
        npm_config_audit_level: "none",
      },
    },
  );

  if (result.error) {
    throw new Error(
      `Não foi possível executar npm audit (${label}): ${result.error.message}`,
    );
  }

  const output = result.stdout.trim();
  if (!output) {
    throw new Error(
      `npm audit (${label}) não retornou JSON. ${result.stderr.trim()}`.trim(),
    );
  }

  try {
    return JSON.parse(output);
  } catch (error) {
    throw new Error(
      `npm audit (${label}) retornou JSON inválido: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
};

const getCounts = (report) => ({
  ...emptyCounts,
  ...(report?.metadata?.vulnerabilities ?? {}),
});

const allowedPackages = new Set(routerException.allowedPackages);
const allowedTitles = new Set(
  routerException.allowedAdvisories.map((advisory) => advisory.title),
);

const validateAudit = (label, report) => {
  const failures = [];
  const counts = getCounts(report);
  const entries = Object.entries(report?.vulnerabilities ?? {});
  const observedTitles = new Set();

  console.log(
    `${label}: total=${counts.total}, critical=${counts.critical}, high=${counts.high}, moderate=${counts.moderate}, low=${counts.low}, info=${counts.info}.`,
  );

  if (entries.length > routerException.maximumPackageVulnerabilities) {
    failures.push(
      `quantidade de pacotes vulneráveis ${entries.length} excede o limite ${routerException.maximumPackageVulnerabilities}`,
    );
  }

  if (
    counts.high > 0 ||
    counts.critical > 0 ||
    counts.low > 0 ||
    counts.info > 0
  ) {
    failures.push("severidade fora da exceção moderada detectada");
  }

  if (counts.moderate !== entries.length || counts.total !== entries.length) {
    failures.push("metadados do npm audit divergem dos pacotes reportados");
  }

  for (const [name, details] of entries) {
    if (!allowedPackages.has(name)) {
      failures.push(`pacote não autorizado pela exceção: ${name}`);
    }
    if (details?.severity !== routerException.allowedSeverity) {
      failures.push(
        `${name}: severidade ${details?.severity ?? "ausente"} não autorizada`,
      );
    }

    console.log(
      `- ${name} | ${details?.severity} | ${
        details?.isDirect === true ? "direta" : "transitiva"
      } | range ${details?.range ?? "não informado"}`,
    );

    for (const via of details?.via ?? []) {
      if (typeof via === "string") {
        if (!allowedPackages.has(via)) {
          failures.push(`${name}: dependência vulnerável não autorizada: ${via}`);
        }
        continue;
      }

      const title = via?.title;
      if (typeof title !== "string" || !allowedTitles.has(title)) {
        failures.push(
          `${name}: advisory não autorizado: ${title ?? via?.url ?? "desconhecido"}`,
        );
      } else {
        observedTitles.add(title);
        console.log(`  advisory: ${title}`);
      }
    }
  }

  for (const title of allowedTitles) {
    if (!observedTitles.has(title)) {
      failures.push(`advisory esperado não foi observado: ${title}`);
    }
  }

  if (failures.length > 0) {
    console.error(`Falhas na ${label}:`);
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
};

const productionReport = runAudit("produção", ["--omit=dev"]);
const completeReport = runAudit("completa");
validateAudit("Auditoria de produção", productionReport);
validateAudit("Auditoria completa", completeReport);

console.log(
  `Contrato B27/B60 aprovado: exceção React Router limitada aos advisories conhecidos e válida até ${reviewBy}.`,
);

await import("./audit-react-router-usage.mjs");

import { spawnSync } from "node:child_process";

const npmExecutable = process.platform === "win32" ? "npm.cmd" : "npm";

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
    throw new Error(`Não foi possível executar npm audit (${label}): ${result.error.message}`);
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

const getAdvisoryTitles = (details) => {
  if (!Array.isArray(details?.via)) return [];

  return details.via
    .map((entry) => {
      if (typeof entry === "string") return entry;
      if (entry && typeof entry === "object") {
        return entry.title ?? entry.name ?? entry.url ?? null;
      }
      return null;
    })
    .filter((entry) => typeof entry === "string" && entry.length > 0);
};

const listRelevantVulnerabilities = (report, severities) =>
  Object.entries(report?.vulnerabilities ?? {})
    .filter(([, details]) => severities.has(details?.severity))
    .map(([name, details]) => ({
      name,
      severity: details.severity,
      direct: details.isDirect === true,
      range: details.range ?? "não informado",
      fixAvailable: details.fixAvailable ?? false,
      advisories: getAdvisoryTitles(details),
    }))
    .sort((left, right) => {
      const severityOrder = { critical: 0, high: 1, moderate: 2, low: 3 };
      return (
        (severityOrder[left.severity] ?? 9) -
          (severityOrder[right.severity] ?? 9) ||
        left.name.localeCompare(right.name)
      );
    });

const printSummary = (label, report) => {
  const counts = getCounts(report);
  console.log(
    `${label}: total=${counts.total}, critical=${counts.critical}, high=${counts.high}, moderate=${counts.moderate}, low=${counts.low}, info=${counts.info}.`,
  );
  return counts;
};

const printVulnerabilities = (label, vulnerabilities) => {
  if (vulnerabilities.length === 0) {
    console.log(`${label}: nenhuma vulnerabilidade alta ou crítica.`);
    return;
  }

  console.log(`${label}:`);
  for (const vulnerability of vulnerabilities) {
    const advisoryText =
      vulnerability.advisories.length > 0
        ? ` | ${vulnerability.advisories.join("; ")}`
        : "";
    console.log(
      `- ${vulnerability.name} | ${vulnerability.severity} | ${
        vulnerability.direct ? "direta" : "transitiva"
      } | range ${vulnerability.range} | fix ${JSON.stringify(
        vulnerability.fixAvailable,
      )}${advisoryText}`,
    );
  }
};

const productionReport = runAudit("produção", ["--omit=dev"]);
const completeReport = runAudit("completa");
const productionCounts = printSummary("Auditoria de produção", productionReport);
printSummary("Auditoria completa", completeReport);

const severeLevels = new Set(["high", "critical"]);
const productionSevere = listRelevantVulnerabilities(
  productionReport,
  severeLevels,
);
const completeSevere = listRelevantVulnerabilities(completeReport, severeLevels);

printVulnerabilities("Riscos altos/críticos em produção", productionSevere);
printVulnerabilities("Riscos altos/críticos no grafo completo", completeSevere);

if (productionCounts.high > 0 || productionCounts.critical > 0) {
  console.error(
    "Gate B27 bloqueado: dependências de runtime possuem vulnerabilidades altas ou críticas.",
  );
  process.exit(1);
}

console.log(
  "Contrato B27 aprovado: nenhuma vulnerabilidade alta ou crítica no grafo de produção.",
);

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
if (existsSync("scripts/apply-react-router-v8-upgrade.mjs") && process.env.GITHUB_WORKFLOW !== "Migração coordenada React Router 8") failures.push("O helper temporário da migração deve ser removido.");
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

import { spawnSync, execFileSync } from "node:child_process";
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";

const packagePath = "package.json";
const scriptPath = "scripts/apply-b27-transitive-audit-fix.mjs";

if (process.env.GITHUB_ACTIONS !== "true") {
  throw new Error("A correção transitiva B27 só pode executar no GitHub Actions.");
}

if (process.env.GITHUB_REF_NAME !== "dev") {
  throw new Error("A correção transitiva B27 só pode executar na branch dev.");
}

const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
delete packageJson.scripts.postinstall;
writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);

const npmExecutable = process.platform === "win32" ? "npm.cmd" : "npm";
const auditFix = spawnSync(
  npmExecutable,
  [
    "audit",
    "fix",
    "--package-lock-only",
    "--ignore-scripts",
    "--no-fund",
  ],
  {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
    env: {
      ...process.env,
      npm_config_audit_level: "critical",
    },
  },
);

process.stdout.write(auditFix.stdout ?? "");
process.stderr.write(auditFix.stderr ?? "");

if (auditFix.error) {
  throw auditFix.error;
}

if (auditFix.status !== 0) {
  throw new Error(
    `npm audit fix --package-lock-only terminou com código ${auditFix.status}.`,
  );
}

unlinkSync(scriptPath);

execFileSync("git", ["config", "user.name", "github-actions[bot]"]);
execFileSync("git", [
  "config",
  "user.email",
  "41898282+github-actions[bot]@users.noreply.github.com",
]);
execFileSync("git", ["add", packagePath, "package-lock.json", scriptPath], {
  stdio: "inherit",
});
execFileSync(
  "git",
  [
    "commit",
    "-m",
    "chore(b27): refresh fixable transitive dependencies [skip ci]",
  ],
  { stdio: "inherit" },
);
execFileSync("git", ["push", "origin", "HEAD:dev"], { stdio: "inherit" });

console.log("Dependências transitivas corrigíveis atualizadas sem --force.");

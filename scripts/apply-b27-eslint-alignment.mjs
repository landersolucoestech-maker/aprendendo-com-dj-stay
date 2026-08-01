import { execFileSync } from "node:child_process";
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";

const packagePath = "package.json";
const scriptPath = "scripts/apply-b27-eslint-alignment.mjs";
const workflowPath = ".github/workflows/b27-eslint-bootstrap.yml";

if (process.env.GITHUB_ACTIONS !== "true") {
  throw new Error("O alinhamento ESLint B27 só pode executar no GitHub Actions.");
}

if (process.env.GITHUB_REF_NAME !== "dev") {
  throw new Error("O alinhamento ESLint B27 só pode executar na branch dev.");
}

const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
packageJson.devDependencies["typescript-eslint"] = "^8.65.0";
writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);

const npmExecutable = process.platform === "win32" ? "npm.cmd" : "npm";
execFileSync(
  npmExecutable,
  [
    "install",
    "--package-lock-only",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
  ],
  { stdio: "inherit" },
);

unlinkSync(scriptPath);
unlinkSync(workflowPath);

execFileSync("git", ["config", "user.name", "github-actions[bot]"]);
execFileSync("git", [
  "config",
  "user.email",
  "41898282+github-actions[bot]@users.noreply.github.com",
]);
execFileSync(
  "git",
  ["add", packagePath, "package-lock.json", scriptPath, workflowPath],
  { stdio: "inherit" },
);
execFileSync(
  "git",
  [
    "commit",
    "-m",
    "chore(b27): align typescript-eslint with ESLint 9 [skip ci]",
  ],
  { stdio: "inherit" },
);
execFileSync("git", ["push", "origin", "HEAD:dev"], { stdio: "inherit" });

console.log("typescript-eslint alinhado e mecanismos temporários removidos.");

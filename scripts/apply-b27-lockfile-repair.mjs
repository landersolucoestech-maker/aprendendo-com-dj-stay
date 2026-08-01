import { execFileSync } from "node:child_process";
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";

const packagePath = "package.json";
const scriptPath = "scripts/apply-b27-lockfile-repair.mjs";
const workflowPath = ".github/workflows/b27-lockfile-bootstrap.yml";

if (process.env.GITHUB_ACTIONS !== "true") {
  throw new Error("O reparo B27 só pode executar no GitHub Actions.");
}

if (process.env.GITHUB_REF_NAME !== "dev") {
  throw new Error("O reparo B27 só pode executar na branch dev.");
}

const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
delete packageJson.scripts.postinstall;
delete packageJson.devDependencies["lovable-tagger"];
packageJson.dependencies["@supabase/supabase-js"] = "^2.110.8";
packageJson.dependencies["react-router-dom"] = "^6.30.4";
packageJson.devDependencies["@vitejs/plugin-react-swc"] = "^4.3.2";
packageJson.devDependencies.postcss = "^8.5.23";
packageJson.devDependencies.vite = "^6.4.3";
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
    "chore(b27): repair dependency lockfile without legacy peers [skip ci]",
  ],
  { stdio: "inherit" },
);
execFileSync("git", ["push", "origin", "HEAD:dev"], { stdio: "inherit" });

console.log("Lockfile B27 reparado; workflow e script temporários removidos.");

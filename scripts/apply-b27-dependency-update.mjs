import { execFileSync } from "node:child_process";
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";

const scriptPath = "scripts/apply-b27-dependency-update.mjs";
const packagePath = "package.json";

if (process.env.GITHUB_ACTIONS !== "true") {
  console.log("Atualização B27 reservada ao runner da branch dev.");
  process.exit(0);
}

if (process.env.GITHUB_REF_NAME !== "dev") {
  throw new Error("A atualização B27 só pode executar na branch dev.");
}

const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
delete packageJson.scripts.postinstall;

packageJson.dependencies["@supabase/supabase-js"] = "^2.110.8";
packageJson.dependencies["react-router-dom"] = "^6.30.4";
packageJson.devDependencies["@vitejs/plugin-react-swc"] = "^4.3.2";
packageJson.devDependencies.postcss = "^8.5.23";
packageJson.devDependencies.vite = "^6.4.3";

writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);

execFileSync(
  process.platform === "win32" ? "npm.cmd" : "npm",
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
    "chore(b27): update dependency security baseline [skip ci]",
  ],
  { stdio: "inherit" },
);
execFileSync("git", ["push", "origin", "HEAD:dev"], { stdio: "inherit" });

console.log("Atualização B27 aplicada e mecanismo temporário removido.");

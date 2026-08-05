import { spawnSync } from "node:child_process";

const ZERO_SHA = /^0+$/;
const previousFromEnvironment = process.env.VERCEL_GIT_PREVIOUS_SHA?.trim();
const currentFromEnvironment = process.env.VERCEL_GIT_COMMIT_SHA?.trim();

const resolveBaseRevision = () => {
  if (
    previousFromEnvironment &&
    !ZERO_SHA.test(previousFromEnvironment) &&
    previousFromEnvironment !== currentFromEnvironment
  ) {
    return previousFromEnvironment;
  }
  return "HEAD^";
};

const baseRevision = resolveBaseRevision();
const diff = spawnSync(
  "git",
  ["diff", "--name-only", "-z", baseRevision, "HEAD"],
  { encoding: "buffer" },
);

if (diff.status !== 0 || !Buffer.isBuffer(diff.stdout)) {
  console.log(
    `Vercel: não foi possível comparar ${baseRevision} com HEAD; o build será executado por segurança.`,
  );
  process.exit(1);
}

const changedFiles = diff.stdout
  .toString("utf8")
  .split("\0")
  .filter(Boolean);

const exactRuntimeFiles = new Set([
  "index.html",
  "package.json",
  "package-lock.json",
  "components.json",
  "vercel.json",
  "scripts/check-build-chunks.mjs",
  "scripts/check-release-artifact.mjs",
]);

const runtimePrefixes = ["src/", "public/"];
const runtimeConfigPatterns = [
  /^vite\.config\.[cm]?[jt]s$/,
  /^tsconfig(?:\.[^.]+)?\.json$/,
  /^tailwind\.config\.[cm]?[jt]s$/,
  /^postcss\.config\.[cm]?[jt]s$/,
];

const affectsDeployment = (file) =>
  exactRuntimeFiles.has(file) ||
  runtimePrefixes.some((prefix) => file.startsWith(prefix)) ||
  runtimeConfigPatterns.some((pattern) => pattern.test(file));

const deploymentFiles = changedFiles.filter(affectsDeployment);

if (deploymentFiles.length === 0) {
  console.log("Vercel: commit sem impacto no frontend; deployment ignorado.");
  console.log(changedFiles.map((file) => `- ${file}`).join("\n") || "- sem arquivos");
  process.exit(0);
}

console.log("Vercel: alterações com impacto no frontend; build obrigatório.");
console.log(deploymentFiles.map((file) => `- ${file}`).join("\n"));
process.exit(1);

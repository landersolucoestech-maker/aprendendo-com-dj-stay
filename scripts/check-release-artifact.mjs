import { execFileSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const releasePath = path.join(root, "dist", "release.json");
const packageJson = JSON.parse(
  await readFile(path.join(root, "package.json"), "utf8"),
);

const resolveExpectedRelease = () => {
  const explicitRelease = process.env.VITE_APP_RELEASE?.trim();
  if (explicitRelease) return explicitRelease;

  const githubRelease = process.env.GITHUB_SHA?.trim();
  if (githubRelease) return githubRelease;

  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
};

let releaseManifest;
try {
  releaseManifest = JSON.parse(await readFile(releasePath, "utf8"));
} catch (error) {
  console.error("Gate B34 bloqueado: dist/release.json ausente ou inválido.", error);
  process.exit(1);
}

const failures = [];
const expectedKeys = [
  "application",
  "environment",
  "release",
  "schema_version",
  "version",
];
const manifestKeys = Object.keys(releaseManifest).sort();
const expectedRelease = resolveExpectedRelease();
const releasePattern = /^[A-Za-z0-9][A-Za-z0-9._-]{6,149}$/;
const environmentPattern = /^[A-Za-z0-9][A-Za-z0-9._-]{1,49}$/;

if (JSON.stringify(manifestKeys) !== JSON.stringify(expectedKeys)) {
  failures.push(
    `release.json deve conter somente ${expectedKeys.join(", ")}; encontrado ${manifestKeys.join(", ")}.`,
  );
}
if (releaseManifest.schema_version !== 1) {
  failures.push("schema_version de release.json deve ser 1.");
}
if (releaseManifest.application !== packageJson.name) {
  failures.push("application de release.json diverge de package.json.");
}
if (releaseManifest.version !== packageJson.version) {
  failures.push("version de release.json diverge de package.json.");
}
if (
  typeof releaseManifest.release !== "string" ||
  !releasePattern.test(releaseManifest.release)
) {
  failures.push("release de release.json não possui formato imutável válido.");
}
if (
  ["unknown", "production", "development", "local-development"].includes(
    releaseManifest.release,
  )
) {
  failures.push("release de build não pode ser um nome de modo ou fallback genérico.");
}
if (expectedRelease === null) {
  failures.push("Não foi possível resolver a revisão esperada para validar o artefato.");
} else if (releaseManifest.release !== expectedRelease) {
  failures.push(
    `release.json contém ${releaseManifest.release}, mas a revisão esperada é ${expectedRelease}.`,
  );
}
if (
  typeof releaseManifest.environment !== "string" ||
  !environmentPattern.test(releaseManifest.environment)
) {
  failures.push("environment de release.json possui formato inválido.");
}

const assetsDirectory = path.join(root, "dist", "assets");
const javascriptFiles = (await readdir(assetsDirectory)).filter((name) =>
  name.endsWith(".js"),
);
let releaseEmbeddedInRuntime = false;
for (const file of javascriptFiles) {
  const source = await readFile(path.join(assetsDirectory, file), "utf8");
  if (source.includes(releaseManifest.release)) {
    releaseEmbeddedInRuntime = true;
    break;
  }
}
if (!releaseEmbeddedInRuntime) {
  failures.push("A revisão do release.json não está incorporada ao runtime compilado.");
}

if (failures.length > 0) {
  console.error("Gate B34 bloqueado:\n- " + failures.join("\n- "));
  process.exit(1);
}

await import("./check-built-runtime-smoke.mjs");

console.log(
  `Gate B34 aprovado: release ${releaseManifest.release} em ${releaseManifest.environment}, vinculada ao runtime e ao artefato determinístico.`,
);

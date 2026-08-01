import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const packageLock = JSON.parse(readFileSync("package-lock.json", "utf8"));
const failures = [];

const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

const normalizePurlName = (name) =>
  encodeURIComponent(name).replaceAll("%2F", "/");

const createPurl = (name, version) =>
  `pkg:npm/${normalizePurlName(name)}@${encodeURIComponent(version)}`;

const getPackageName = (packagePath, packageEntry) => {
  if (typeof packageEntry.name === "string" && packageEntry.name.length > 0) {
    return packageEntry.name;
  }

  const marker = "node_modules/";
  const index = packagePath.lastIndexOf(marker);
  return index >= 0 ? packagePath.slice(index + marker.length) : null;
};

const toCycloneDxHash = (integrity) => {
  if (typeof integrity !== "string") return null;

  const candidates = integrity.trim().split(/\s+/);
  for (const candidate of candidates) {
    const separator = candidate.indexOf("-");
    if (separator <= 0) continue;

    const algorithm = candidate.slice(0, separator).toLowerCase();
    const encodedDigest = candidate.slice(separator + 1);
    const cycloneAlgorithm = {
      sha256: "SHA-256",
      sha384: "SHA-384",
      sha512: "SHA-512",
    }[algorithm];

    if (!cycloneAlgorithm || encodedDigest.length === 0) continue;

    return {
      alg: cycloneAlgorithm,
      content: Buffer.from(encodedDigest, "base64")
        .toString("hex")
        .toUpperCase(),
    };
  }

  return null;
};

const prohibitedProtocol = /^(?:git(?:\+[^:]+)?:|file:|link:|workspace:|http:)/i;
const registryPrefix = "https://registry.npmjs.org/";
const rootLockEntry = packageLock.packages?.[""];

expect(packageLock.lockfileVersion === 3, "package-lock.json deve usar lockfileVersion 3.");
expect(packageLock.requires === true, "package-lock.json deve declarar requires=true.");
expect(rootLockEntry !== undefined, "package-lock.json deve possuir entrada raiz.");
expect(packageJson.scripts?.postinstall === undefined, "Projeto não pode manter postinstall automático.");

for (const dependencyGroup of ["dependencies", "devDependencies"]) {
  const manifestDependencies = packageJson[dependencyGroup] ?? {};
  const lockDependencies = rootLockEntry?.[dependencyGroup] ?? {};

  for (const [name, version] of Object.entries(manifestDependencies)) {
    expect(
      lockDependencies[name] === version,
      `Lockfile deve reproduzir ${dependencyGroup}.${name}=${version}.`,
    );
  }

  for (const name of Object.keys(lockDependencies)) {
    expect(
      manifestDependencies[name] !== undefined,
      `Lockfile raiz contém ${dependencyGroup}.${name} ausente no manifesto.`,
    );
  }
}

const components = [];
const componentRefs = new Set();
const packageEntries = Object.entries(packageLock.packages ?? {})
  .filter(([packagePath]) => packagePath !== "")
  .sort(([leftPath], [rightPath]) => leftPath.localeCompare(rightPath));

for (const [packagePath, packageEntry] of packageEntries) {
  if (packageEntry.link === true) {
    failures.push(`Dependência por link local não permitida: ${packagePath}.`);
    continue;
  }

  const name = getPackageName(packagePath, packageEntry);
  const version = packageEntry.version;
  expect(typeof name === "string" && name.length > 0, `Nome ausente em ${packagePath}.`);
  expect(typeof version === "string" && version.length > 0, `Versão ausente em ${packagePath}.`);
  if (!name || !version) continue;

  expect(!prohibitedProtocol.test(version), `Versão com protocolo proibido em ${packagePath}: ${version}.`);

  const resolved = packageEntry.resolved;
  if (typeof resolved === "string") {
    expect(!prohibitedProtocol.test(resolved), `Origem insegura em ${packagePath}: ${resolved}.`);
    expect(
      resolved.startsWith(registryPrefix),
      `Pacote deve vir do registry npm oficial: ${packagePath} (${resolved}).`,
    );
  }

  const hash = toCycloneDxHash(packageEntry.integrity);
  expect(hash !== null, `Integridade SHA-256/384/512 ausente em ${packagePath}.`);

  const purl = createPurl(name, version);
  const pathDigest = createHash("sha256").update(packagePath).digest("hex").slice(0, 16);
  const bomRef = `${purl}?path=${pathDigest}`;
  expect(!componentRefs.has(bomRef), `Referência SBOM duplicada: ${bomRef}.`);
  componentRefs.add(bomRef);

  components.push({
    type: "library",
    "bom-ref": bomRef,
    name,
    version,
    purl,
    ...(hash ? { hashes: [hash] } : {}),
    ...(typeof resolved === "string"
      ? {
          externalReferences: [
            {
              type: "distribution",
              url: resolved,
            },
          ],
        }
      : {}),
    properties: [
      {
        name: "npm:packagePath",
        value: packagePath,
      },
      {
        name: "npm:development",
        value: String(packageEntry.dev === true),
      },
      {
        name: "npm:optional",
        value: String(packageEntry.optional === true),
      },
    ],
  });
}

components.sort((left, right) => left["bom-ref"].localeCompare(right["bom-ref"]));

if (failures.length > 0) {
  console.error("Contrato B28 inválido:\n- " + [...new Set(failures)].join("\n- "));
  process.exit(1);
}

const rootPurl = createPurl(packageJson.name, packageJson.version);
const sbom = {
  bomFormat: "CycloneDX",
  specVersion: "1.5",
  version: 1,
  metadata: {
    component: {
      type: "application",
      "bom-ref": rootPurl,
      name: packageJson.name,
      version: packageJson.version,
      purl: rootPurl,
    },
    properties: [
      {
        name: "build:source",
        value: "package-lock.json",
      },
      {
        name: "build:lockfileVersion",
        value: String(packageLock.lockfileVersion),
      },
    ],
  },
  components,
};

mkdirSync("artifacts", { recursive: true });
writeFileSync("artifacts/sbom.cdx.json", `${JSON.stringify(sbom, null, 2)}\n`);

console.log(
  `Contrato B28 aprovado: ${components.length} componentes verificados e SBOM CycloneDX gerado.`,
);

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";

const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const gitignore = readFileSync(".gitignore", "utf8");
const trackedFiles = execFileSync("git", ["ls-files", "-z"], {
  encoding: "utf8",
})
  .split("\0")
  .filter(Boolean)
  .sort((left, right) => left.localeCompare(right));
const pendingTrackedDeletions = new Set(
  execFileSync("git", ["diff", "--name-only", "--diff-filter=D", "-z"], {
    encoding: "utf8",
  })
    .split("\0")
    .filter(Boolean),
);

const forbiddenPathPatterns = [
  /^(?:node_modules|dist|dist-ssr|coverage|artifacts)\//,
  /^(?:\.env|\.env\..+)$/,
  /(?:^|\/)(?:id_rsa|id_ed25519)$/,
  /\.(?:pem|key|p12|pfx)$/i,
  /^supabase\/\.temp\//,
];

const secretPatterns = [
  {
    name: "chave privada",
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  },
  {
    name: "GitHub token clássico",
    pattern: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/,
  },
  {
    name: "GitHub fine-grained token",
    pattern: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/,
  },
  {
    name: "AWS access key",
    pattern: /\bAKIA[0-9A-Z]{16}\b/,
  },
  {
    name: "Supabase secret key",
    pattern: /\bsb_secret_[A-Za-z0-9_-]{20,}\b/,
  },
  {
    name: "Stripe live secret",
    pattern: /\bsk_live_[A-Za-z0-9]{20,}\b/,
  },
  {
    name: "OpenAI secret key",
    pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}\b/,
  },
];

const isProbablyText = (buffer) => {
  const sample = buffer.subarray(0, Math.min(buffer.length, 8192));
  return !sample.includes(0);
};

const findServiceRoleJwt = (source) => {
  const jwtPattern = /\beyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
  for (const token of source.matchAll(jwtPattern)) {
    const payloadSegment = token[0].split(".")[1];
    if (!payloadSegment) continue;

    try {
      const normalized = payloadSegment.replaceAll("-", "+").replaceAll("_", "/");
      const payload = JSON.parse(Buffer.from(normalized, "base64").toString("utf8"));
      if (payload?.role === "service_role") return true;
    } catch {
      // Tokens não decodificáveis não são tratados como credencial Supabase válida.
    }
  }
  return false;
};

expect(trackedFiles.length > 0, "Git não retornou arquivos versionados.");
for (const requiredIgnore of [
  "node_modules/",
  "dist/",
  "coverage/",
  ".env",
  ".env.*",
  "artifacts/",
  "supabase/.temp/",
]) {
  expect(
    gitignore.split(/\r?\n/).includes(requiredIgnore),
    `.gitignore deve conter ${requiredIgnore}.`,
  );
}

const manifestFiles = [];
let totalBytes = 0;
const maxTrackedFileBytes = 10 * 1024 * 1024;

for (const path of trackedFiles) {
  for (const pattern of forbiddenPathPatterns) {
    expect(!pattern.test(path), `Arquivo proibido versionado: ${path}.`);
  }

  if (!existsSync(path)) {
    expect(
      pendingTrackedDeletions.has(path),
      `Arquivo versionado ausente sem exclusão registrada no diff: ${path}.`,
    );
    continue;
  }

  const stats = statSync(path);
  expect(stats.isFile(), `Entrada versionada não é arquivo regular: ${path}.`);
  expect(
    stats.size <= maxTrackedFileBytes,
    `Arquivo versionado excede 10 MiB: ${path} (${stats.size} bytes).`,
  );

  const content = readFileSync(path);
  const sha256 = createHash("sha256").update(content).digest("hex");
  totalBytes += content.length;
  manifestFiles.push({
    path,
    size: content.length,
    sha256,
  });

  if (!isProbablyText(content) || content.length > 2 * 1024 * 1024) continue;
  const source = content.toString("utf8");

  for (const secretPattern of secretPatterns) {
    expect(
      !secretPattern.pattern.test(source),
      `Possível ${secretPattern.name} versionada em ${path}.`,
    );
  }

  expect(
    !findServiceRoleJwt(source),
    `JWT Supabase service_role versionado em ${path}.`,
  );
}

if (failures.length > 0) {
  console.error("Contrato B29 inválido:\n- " + [...new Set(failures)].join("\n- "));
  process.exit(1);
}

const digestSource = manifestFiles
  .map(({ path, size, sha256 }) => `${path}\0${size}\0${sha256}\n`)
  .join("");
const sourceDigest = createHash("sha256").update(digestSource).digest("hex");
const manifest = {
  format: "aprendendo-com-dj-stay/source-manifest",
  version: 1,
  application: {
    name: packageJson.name,
    version: packageJson.version,
  },
  sourceDigest: {
    algorithm: "SHA-256",
    value: sourceDigest,
  },
  fileCount: manifestFiles.length,
  totalBytes,
  files: manifestFiles,
};

mkdirSync("artifacts", { recursive: true });
writeFileSync(
  "artifacts/source-manifest.json",
  `${JSON.stringify(manifest, null, 2)}\n`,
);

console.log(
  `Contrato B29 aprovado: ${manifestFiles.length} arquivos, ${totalBytes} bytes e nenhum segredo forte detectado.`,
);
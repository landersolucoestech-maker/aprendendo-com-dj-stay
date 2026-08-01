import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

const assetsDirectory = path.join(process.cwd(), "dist", "assets");
const maximumChunkBytes = 500 * 1024;
const minimumChunkCount = 8;
const requiredChunkPrefixes = [
  "vendor-react-",
  "vendor-query-",
  "vendor-supabase-",
];

const formatKiB = (bytes) => `${(bytes / 1024).toFixed(2)} KiB`;

let assetNames;
try {
  assetNames = await readdir(assetsDirectory);
} catch (error) {
  console.error("Gate de chunks bloqueado: dist/assets não foi gerado.", error);
  process.exit(1);
}

const javascriptFiles = assetNames.filter(
  (name) => name.endsWith(".js") && !name.endsWith(".js.map"),
);

if (javascriptFiles.length < minimumChunkCount) {
  console.error(
    `Gate de chunks bloqueado: foram gerados ${javascriptFiles.length} chunks JavaScript; o mínimo esperado após lazy loading é ${minimumChunkCount}.`,
  );
  process.exit(1);
}

const chunks = await Promise.all(
  javascriptFiles.map(async (name) => {
    const file = path.join(assetsDirectory, name);
    const [metadata, source] = await Promise.all([
      stat(file),
      readFile(file, "utf8"),
    ]);
    return { name, bytes: metadata.size, source };
  }),
);

chunks.sort((left, right) => right.bytes - left.bytes);
const oversizedChunks = chunks.filter((chunk) => chunk.bytes > maximumChunkBytes);
const missingRequiredChunks = requiredChunkPrefixes.filter(
  (prefix) => !chunks.some((chunk) => chunk.name.startsWith(prefix)),
);

const chunkNames = new Set(chunks.map((chunk) => chunk.name));
const staticImportPattern = /(?:\bfrom\s*|\bimport\s*)["']\.\/([^"']+\.js)["']/g;
const graph = new Map();

for (const chunk of chunks) {
  const dependencies = new Set();
  for (const match of chunk.source.matchAll(staticImportPattern)) {
    const dependency = match[1];
    if (dependency && chunkNames.has(dependency)) dependencies.add(dependency);
  }
  graph.set(chunk.name, dependencies);
}

const visited = new Set();
const active = new Set();
const stack = [];
let circularPath = null;

const visit = (chunkName) => {
  if (circularPath) return;
  if (active.has(chunkName)) {
    const cycleStart = stack.indexOf(chunkName);
    circularPath = [...stack.slice(cycleStart), chunkName];
    return;
  }
  if (visited.has(chunkName)) return;

  active.add(chunkName);
  stack.push(chunkName);
  for (const dependency of graph.get(chunkName) ?? []) visit(dependency);
  stack.pop();
  active.delete(chunkName);
  visited.add(chunkName);
};

for (const chunkName of graph.keys()) visit(chunkName);

console.log("Chunks JavaScript gerados:");
for (const chunk of chunks) {
  console.log(`- ${chunk.name}: ${formatKiB(chunk.bytes)}`);
}

if (missingRequiredChunks.length > 0) {
  console.error(
    `Gate de chunks bloqueado: chunks obrigatórios ausentes: ${missingRequiredChunks.join(", ")}.`,
  );
  process.exit(1);
}

if (oversizedChunks.length > 0) {
  console.error(
    `Gate de chunks bloqueado: nenhum arquivo pode exceder ${formatKiB(maximumChunkBytes)}.`,
  );
  for (const chunk of oversizedChunks) {
    console.error(`- ${chunk.name}: ${formatKiB(chunk.bytes)}`);
  }
  process.exit(1);
}

if (circularPath) {
  console.error(
    `Gate de chunks bloqueado: dependência estática circular detectada: ${circularPath.join(" -> ")}.`,
  );
  process.exit(1);
}

console.log(
  `Gate de chunks aprovado: ${chunks.length} arquivos JavaScript, maior chunk com ${formatKiB(chunks[0]?.bytes ?? 0)} e grafo estático acíclico.`,
);

import { readdir, stat } from "node:fs/promises";
import path from "node:path";

const assetsDirectory = path.join(process.cwd(), "dist", "assets");
const maximumChunkBytes = 500 * 1024;
const minimumChunkCount = 8;

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
    const metadata = await stat(file);
    return { name, bytes: metadata.size };
  }),
);

chunks.sort((left, right) => right.bytes - left.bytes);
const oversizedChunks = chunks.filter((chunk) => chunk.bytes > maximumChunkBytes);

console.log("Chunks JavaScript gerados:");
for (const chunk of chunks) {
  console.log(`- ${chunk.name}: ${formatKiB(chunk.bytes)}`);
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

console.log(
  `Gate de chunks aprovado: ${chunks.length} arquivos JavaScript, maior chunk com ${formatKiB(chunks[0]?.bytes ?? 0)}.`,
);

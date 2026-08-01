import { readFileSync } from "node:fs";

const viteConfig = readFileSync("vite.config.ts", "utf8");
const chunkGate = readFileSync("scripts/check-build-chunks.mjs", "utf8");
const failures = [];

for (const fragment of [
  'normalizedId.includes("/@remix-run/router/")',
  'return "vendor-react"',
  'log.code === "CIRCULAR_CHUNK"',
  'log.message.includes("Circular chunk:")',
  "Grafo de chunks circular bloqueado",
  "handler(level, log)",
]) {
  if (!viteConfig.includes(fragment)) {
    failures.push(`vite.config.ts não preserva o contrato B32: ${fragment}`);
  }
}

for (const fragment of [
  '"vendor-react-"',
  '"vendor-query-"',
  '"vendor-supabase-"',
  "staticImportPattern",
  "circularPath",
  "dependência estática circular detectada",
  "grafo estático acíclico",
]) {
  if (!chunkGate.includes(fragment)) {
    failures.push(`Gate de chunks não preserva o contrato B32: ${fragment}`);
  }
}

if (viteConfig.includes("onLog: undefined") || viteConfig.includes("onwarn: undefined")) {
  failures.push("Avisos do bundler não podem ser desativados no B32.");
}

if (viteConfig.includes('return "vendor-misc"')) {
  failures.push(
    "Dependências não classificadas não podem ser forçadas para vendor-misc; o fallback artificial recria ciclos entre famílias.",
  );
}

const fallbackSection = viteConfig.slice(
  viteConfig.lastIndexOf('return "vendor-ui"'),
  viteConfig.indexOf("};", viteConfig.lastIndexOf('return "vendor-ui"')),
);
if (!fallbackSection.includes("return undefined;")) {
  failures.push(
    "Dependências não classificadas devem retornar undefined para o Rollup definir a fronteira natural do chunk.",
  );
}

if (failures.length > 0) {
  console.error("Contrato B32 inválido:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(
  "Contrato B32 aprovado: famílias centrais explícitas, fallback natural, avisos circulares bloqueados e grafo gerado auditado.",
);

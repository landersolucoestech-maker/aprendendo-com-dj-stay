import { existsSync, readFileSync } from "node:fs";

const paths = {
  index: "index.html",
  brand: "src/config/brand.ts",
  parent: "scripts/check-supply-chain-contract.mjs",
  documentation: "docs/refactor/FASE-B114-PUBLIC-SHELL-PROVENANCE.md",
  favicon: "public/favicon.ico",
};

const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};
const read = (path) => (existsSync(path) ? readFileSync(path, "utf8") : "");

for (const path of Object.values(paths)) {
  expect(existsSync(path), `Arquivo B114 ausente: ${path}`);
}

const index = read(paths.index);
const normalizedIndex = index.toLocaleLowerCase("pt-BR");
const brand = read(paths.brand);
const parent = read(paths.parent);
const documentation = read(paths.documentation);

for (const fragment of [
  '<html lang="pt-BR">',
  "<title>Aprendendo com DJ Stay</title>",
  '<meta name="description" content="Plataforma educacional Aprendendo com DJ Stay." />',
  '<meta name="author" content="LANDER SOLUTIONS" />',
  '<meta name="referrer" content="strict-origin-when-cross-origin" />',
  '<link rel="icon" href="/favicon.ico" />',
  '<meta property="og:title" content="Aprendendo com DJ Stay" />',
  '<meta property="og:description" content="Plataforma educacional Aprendendo com DJ Stay." />',
  '<meta property="og:type" content="website" />',
  '<meta name="twitter:card" content="summary" />',
  '<div id="root"></div>',
  '<script type="module" src="/src/main.tsx"></script>',
]) {
  expect(index.includes(fragment), `Shell público B114 ausente: ${fragment}`);
}

for (const forbidden of [
  "lovable",
  "gpteng",
  "gptengineer",
  "generated project",
  "@lovable_dev",
  "do not remove",
  "cdn.gpteng.co",
  "lovable.dev",
]) {
  expect(
    !normalizedIndex.includes(forbidden),
    `Shell público B114 contém artefato proibido: ${forbidden}`,
  );
}

expect(
  !/https?:\/\//i.test(index),
  "index.html não pode carregar ou anunciar origens HTTP/HTTPS sem aprovação explícita.",
);
expect(
  !index.includes('property="og:image"'),
  "index.html não pode publicar imagem Open Graph não definida formalmente.",
);
expect(
  !index.includes('name="twitter:image"'),
  "index.html não pode publicar imagem de Twitter não definida formalmente.",
);
expect(
  !index.includes('name="twitter:site"'),
  "index.html não pode publicar conta social não definida formalmente.",
);

const scriptSources = [...index.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*>/gi)].map(
  (match) => match[1],
);
expect(
  scriptSources.length === 1 && scriptSources[0] === "/src/main.tsx",
  `Shell público deve executar somente /src/main.tsx; encontrado: ${scriptSources.join(", ") || "nenhum"}.`,
);

for (const fragment of [
  'operationalName: "Aprendendo com DJ Stay"',
  'legalOwner: "LANDER SOLUTIONS"',
]) {
  expect(brand.includes(fragment), `Identidade operacional B114 ausente: ${fragment}`);
}

expect(
  parent.includes('await import("./check-public-shell-provenance.mjs")'),
  "Contrato B114 deve permanecer encadeado ao gate de supply chain.",
);

for (const fragment of [
  "FASE B114",
  "idioma `pt-BR`",
  "único script executável",
  "Nenhuma migration",
  "Supabase remoto não foi modificado",
  "branch `main` não foi alterada",
  "não equivale a homologação externa",
]) {
  expect(documentation.includes(fragment), `Documentação B114 ausente: ${fragment}`);
}

if (failures.length > 0) {
  console.error("Contrato B114 inválido:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(
  "Contrato B114 aprovado: shell público local, metadados operacionais e proveniência de bootstrap permanecem livres de artefatos externos herdados.",
);

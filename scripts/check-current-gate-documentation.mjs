import { existsSync, readFileSync } from "node:fs";

const paths = {
  status: "docs/STATUS.md",
  phase: "docs/refactor/FASE-B134-CURRENT-GATE-DOCUMENTATION-TRUTH.md",
};
const failures = [];

for (const path of Object.values(paths)) {
  if (!existsSync(path)) failures.push(`Fonte B134 ausente: ${path}`);
}

const requireFragments = (label, content, fragments) => {
  for (const fragment of fragments) {
    if (!content.includes(fragment)) {
      failures.push(`${label} não comprova B134: ${fragment}`);
    }
  }
};

if (failures.length === 0) {
  const status = readFileSync(paths.status, "utf8");
  const phase = readFileSync(paths.phase, "utf8");

  requireFragments("STATUS.md", status, [
    "exatamente um request principal `Document` por rota em cada carregamento direto",
    "exatamente nove artefatos de rede",
    "um único `Document` inicial",
    "não cria novo `Document`",
    "uma única execução do smoke principal sem contorno no workflow",
    "7f0b21f4f39dd80508f589619e89b987d903a5bc",
    "#1055",
    "30952181505",
    "799 testes unitários",
    "1.878 testes pgTAP",
    "A branch `main` e o projeto Supabase de produção não foram promovidos",
  ]);

  requireFragments("FASE B134", phase, [
    "documentação operacional atrás do código validado",
    "exatamente nove artefatos `*.network.json`",
    "um único `Document` inicial e nenhum novo `Document`",
    "ausência de repetição integral do smoke",
    "não pode declarar o workaround de repetição como comportamento atual",
    "a branch `main` e o Supabase de produção permanecem sem promoção",
  ]);
}

if (failures.length > 0) {
  console.error("Contrato B134 inválido:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(
  "Contrato B134 aprovado: status operacional e fase documental apontam para a evidência integral atual, sem reintroduzir o contorno do Chrome.",
);

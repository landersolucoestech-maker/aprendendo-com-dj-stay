import { existsSync, readFileSync } from "node:fs";

const paths = {
  status: "docs/STATUS.md",
  phase: "docs/refactor/FASE-B139-INTERACTION-RUNTIME-TRUTH.md",
};
const failures = [];

for (const path of Object.values(paths)) {
  if (!existsSync(path)) failures.push(`Fonte B139 ausente: ${path}`);
}

const requireFragments = (label, content, fragments) => {
  for (const fragment of fragments) {
    if (!content.includes(fragment)) {
      failures.push(`${label} não comprova B139: ${fragment}`);
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
    "c4e299b8f544dc07bd394f1ae287efb4ee53e2e9",
    "#1074",
    "30957555483",
    "799 testes unitários",
    "1.878 testes pgTAP",
    "A branch `main` e o projeto Supabase de produção não foram promovidos",
  ]);

  requireFragments("FASE B139", phase, [
    "verdade consolidada das interações públicas",
    "commit `c4e299b8f544dc07bd394f1ae287efb4ee53e2e9`",
    "issue de evidência `#1074`",
    "run `30957555483`",
    "skip link alcançado e ativado por teclado real",
    "exatamente um `Document` inicial por prova client-side",
    "zero origem externa e zero resposta HTTP com status maior ou igual a 400",
    "Produção e branch `main` permanecem sem promoção",
  ]);
}

if (failures.length > 0) {
  console.error("Contrato B139 inválido:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(
  "Contrato B139 aprovado: status operacional e fase documental apontam para a evidência integral atual das interações públicas, sem reintroduzir o contorno do Chrome.",
);

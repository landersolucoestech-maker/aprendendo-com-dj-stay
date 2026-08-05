import { readFileSync, writeFileSync } from "node:fs";

const path = "scripts/check-route-focus-handoff.mjs";
let source = readFileSync(path, "utf8");

const replacements = [
  {
    label: "invariante do monitor",
    old: `  "sawDeferred",\n  "deferredFocused",`,
    next: `  "sawDeferred",\n  "state.probe !== null",\n  "deferredFocused",`,
  },
  {
    label: "mensagem antiga de fallback obrigatório",
    old: `  "A transição B125 não observou o fallback com foco diferido.",`,
    next: `  "A prova B125 não instalou o monitor de foco da transição.",`,
  },
  {
    label: "resumo do contrato",
    old: `  "Contrato B125/B135 aprovado: fallbacks mantêm foco diferido e a transição para login é acionada pelo link real com evento confiável, sem mutação artificial do histórico.",`,
    next: `  "Contrato B125/B135 aprovado: fallbacks, quando renderizados, mantêm foco diferido; a transição rápida ou suspensa termina no conteúdo final por clique real confiável, sem mutação artificial do histórico.",`,
  },
];

for (const replacement of replacements) {
  const occurrences = source.split(replacement.old).length - 1;
  if (occurrences !== 1) {
    throw new Error(
      `${replacement.label}: esperado exatamente um trecho, encontrado ${occurrences}.`,
    );
  }
  source = source.replace(replacement.old, replacement.next);
}

writeFileSync(path, source, "utf8");
console.log("Checker B125/B135 alinhado à navegação rápida sem enfraquecer foco final.");

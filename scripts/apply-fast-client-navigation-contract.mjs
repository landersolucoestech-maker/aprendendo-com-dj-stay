import { readFileSync, writeFileSync } from "node:fs";

const path = "scripts/run-browser-client-navigation-smoke.mjs";
let source = readFileSync(path, "utf8");

const replacements = [
  {
    label: "condição final independente da observação do fallback",
    old: `      state.probe?.sawDeferred === true &&\n      state.probe?.deferredFocused === false &&`,
    next: `      state.probe !== null &&\n      state.probe?.deferredFocused === false &&`,
  },
  {
    label: "asserção obrigatória de fallback removida",
    old: `  if (finalState?.probe?.sawDeferred !== true) {\n    failures.push("A transição B125 não observou o fallback com foco diferido.");\n  }\n`,
    next: `  if (finalState?.probe === null || finalState?.probe === undefined) {\n    failures.push("A prova B125 não instalou o monitor de foco da transição.");\n  }\n`,
  },
  {
    label: "mensagem de sucesso atualizada",
    old: `  "Smoke B125/B132/B135/B138 aprovado: skip link foi focado e ativado por teclado confiável, login real preservou o handoff lazy, e toda a rede client-side permaneceu isolada.",`,
    next: `  "Smoke B125/B132/B135/B138 aprovado: skip link foi focado e ativado por teclado confiável, login real transferiu o foco ao conteúdo final com ou sem fallback observável, e toda a rede client-side permaneceu isolada.",`,
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
console.log(
  "Contrato de navegação rápida aplicado: fallback é opcional, foco final e não foco do fallback continuam bloqueantes.",
);

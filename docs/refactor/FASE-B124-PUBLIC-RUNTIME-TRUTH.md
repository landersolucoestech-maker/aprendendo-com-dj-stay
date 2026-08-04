# FASE B124 — Verdade consolidada do runtime público

## Objetivo

Consolidar na documentação operacional somente as garantias comprovadas no mesmo snapshot pelos gates B118, B122 e B123.

## Estado comprovado

O commit `63ebdfd043fc4a3ba02642c7b0f470e97be0611d` foi aprovado por instalação, lint, testes unitários, reconstrução local do Supabase, pgTAP, sincronização de tipos, contratos, TypeScript, build, entrega HTTP e Chrome headless.

O navegador executou oito rotas públicas:

- `/`;
- `/login`;
- `/certificado`;
- `/contato`;
- `/matricule-se`;
- `/esqueceu-senha`;
- `/acesso-negado`;
- fallback 404 por rota inexistente.

Em cada artefato exportado foram confirmados:

- conteúdo final contratado;
- exatamente um `#main-content`;
- landmark principal semântico;
- `tabindex="-1"`;
- exatamente um skip link;
- live region de navegação;
- zero exceções `Runtime.exceptionThrown`.

## Atualizações documentais

`docs/STATUS.md` passa a registrar:

- a matriz de oito rotas;
- a prontidão acessível como parte do runtime público;
- a reconciliação do landmark após substituições do `Suspense`;
- o commit verde mais recente;
- a separação entre artefato de qualidade e implantação real.

`docs/refactor/README.md` passa a exigir a mesma matriz e as mesmas propriedades no GitHub Actions.

## Contrato permanente

`scripts/check-documentation-truth.mjs` inclui os documentos B122, B123 e B124 como fontes obrigatórias. O gate rejeita:

- status ainda limitado a três rotas;
- ausência de landmark, skip link ou live region na verdade operacional;
- evidência apontando para snapshot anterior;
- alegação de produção, homologação financeira ou pentest sem comprovação externa.

## Limites

A verdade consolidada do runtime público não equivale a:

- E2E autenticado;
- submissão real de formulários;
- homologação do provider financeiro;
- teste com leitor de tela;
- pentest;
- promoção para produção.

## Exclusões

- Nenhuma migration foi criada ou alterada.
- O Supabase remoto não foi modificado.
- A branch `main` não foi alterada.
- Nenhuma dependência ou lockfile foi alterado.

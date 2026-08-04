# FASE B117 — Limpeza de evidências de gate superadas

## Problema comprovado

Execuções com falha devem permanecer abertas enquanto representam o último estado técnico conhecido. Porém, depois que um commit posterior fecha integralmente verde, as issues antigas de evidência continuam abertas e deixam de representar o estado atual da branch `dev`.

Esse comportamento acumulou evidências técnicas já superadas e poluiu a fila de issues sem acrescentar informação operacional.

## Implementação

Quando o gate atual termina com todos os estágios em `success`, o workflow:

1. fecha a evidência atual como `completed`;
2. lista issues abertas do repositório por páginas de até 100 registros;
3. seleciona somente issues cujo título começa com `Gate técnico —`;
4. exige que a issue tenha sido criada por `github-actions[bot]`;
5. exige que o corpo contenha `Commit validado:`;
6. considera somente números menores que o da evidência atual;
7. fecha cada evidência selecionada como `not_planned`.

Pull requests, issues funcionais, evidências posteriores e qualquer issue que não corresponda integralmente ao contrato permanecem intactas.

## Segurança operacional

A reconciliação usa a mesma API REST versionada e os mesmos headers da criação da evidência. O fechamento histórico ocorre exclusivamente dentro do bloco `gateSucceeded`; execuções falhas ou incompletas não podem reconciliar issues anteriores.

A paginação possui limite defensivo de 100 páginas. Caso o limite seja atingido sem uma página final menor que 100 itens, o workflow falha em vez de assumir que a listagem terminou.

## Contrato permanente

O gate `scripts/check-gate-evidence-lifecycle.mjs` verifica:

- criação e classificação da evidência atual;
- paginação explícita das issues abertas;
- filtros de título, autor, corpo e número anterior;
- fechamento histórico apenas com `state_reason: not_planned`;
- proteção exclusiva pelo estado `gateSucceeded`;
- reutilização dos headers versionados em todas as requisições.

## Exclusões

- Nenhuma migration foi criada ou alterada.
- O Supabase remoto não foi modificado.
- A branch `main` não foi alterada.
- Nenhuma issue de produto é alterada por esta lógica.
- A aprovação em `dev` não equivale a homologação externa ou promoção para produção.

# Fase B49 — Ciclo de vida das evidências do gate técnico

## Objetivo

Impedir que execuções bem-sucedidas do workflow `Gate técnico` permaneçam como issues abertas, sem eliminar a rastreabilidade histórica e sem ocultar execuções com falha, cancelamento ou etapas ignoradas.

## Problema confirmado

O workflow criava uma issue para toda execução na branch `dev`, mas não encerrava automaticamente evidências integralmente verdes. Como consequência, o repositório acumulou centenas de issues abertas intituladas `Gate técnico — <sha>`, misturando falhas acionáveis com execuções concluídas com sucesso.

## Regra implementada

O workflow continua criando uma issue por execução e preservando:

- commit validado;
- URL do run;
- resultado de `npm ci`;
- resultado do lint;
- resultado do banco e pgTAP;
- resultado da geração de tipos;
- resultado do TypeScript;
- resultado do build.

Depois da criação:

- a evidência é encerrada como `completed` somente quando todos os seis resultados obrigatórios são exatamente `success`;
- qualquer resultado `failure`, `cancelled`, `skipped` ou diferente de `success` mantém a issue aberta;
- o gate final continua bloqueando a execução quando qualquer etapa obrigatória não for bem-sucedida.

## Contrato estático

O arquivo `scripts/check-gate-evidence-lifecycle.mjs` valida:

- cálculo explícito dos resultados obrigatórios;
- condição `gateSucceeded` baseada exclusivamente em `success`;
- criação da issue antes do encerramento;
- encerramento por `PATCH` usando o número retornado pela criação;
- uso de `state: "closed"` e `state_reason: "completed"`;
- encerramento protegido pelo bloco `if (gateSucceeded)`;
- reutilização dos cabeçalhos oficiais e da API GitHub versionada em `2026-03-10` nas duas requisições.

O contrato B49 é executado pelo gate existente `check:github-api-version`, mantendo uma única entrada de validação para o comportamento da integração GitHub do workflow.

## Escopo excluído

- nenhuma issue histórica foi removida;
- evidências históricas não foram reescritas;
- aplicação e frontend não foram alterados;
- nenhuma migration ou dado foi alterado;
- Edge Functions e projetos Supabase permaneceram inalterados;
- branch `main` permaneceu inalterada.

## Critérios de aceite

- evidência verde encerrada automaticamente;
- evidência não verde mantida aberta;
- conteúdo da evidência preservado;
- API GitHub explicitamente versionada;
- contrato estático integrado ao gate;
- gate técnico integral aprovado na branch `dev`.

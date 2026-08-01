# Fase B32 — Integridade do grafo de chunks

## Problema observado

O build emitia dependência circular entre `vendor-misc` e `vendor-react`. A causa era a separação de `@remix-run/router`, dependência direta da família React Router, para o fallback genérico.

## Correção

- `@remix-run/router` passa a compor `vendor-react`;
- avisos `CIRCULAR_CHUNK` e mensagens `Circular chunk:` abortam o build;
- o gate pós-build lê os imports estáticos dos arquivos JavaScript gerados;
- ciclos no grafo real de chunks bloqueiam a entrega;
- os chunks centrais `vendor-react`, `vendor-query` e `vendor-supabase` são obrigatórios;
- permanece o limite máximo de 500 KiB por arquivo JavaScript;
- o fallback `vendor-misc` continua explícito para dependências ainda não classificadas.

## Garantias

A fase não altera dependências, comportamento de aplicação ou regras de lazy loading. Ela corrige apenas a fronteira dos chunks e torna regressões observáveis no CI.

## Evidência automatizada

- `vite.config.ts` bloqueia avisos circulares;
- `scripts/check-build-chunks.mjs` valida tamanho, chunks obrigatórios e aciclicidade;
- `scripts/check-chunk-graph-contract.mjs` protege a configuração B32;
- o gate integral continua executando lint, banco, pgTAP, tipos, TypeScript, audit e build.

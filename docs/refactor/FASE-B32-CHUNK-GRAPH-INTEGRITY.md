# Fase B32 — Integridade do grafo de chunks

## Problema observado

O build emitia dependência circular entre `vendor-misc` e `vendor-react`. A causa não era apenas um pacote isolado: o fallback genérico forçava dependências sem uma fronteira comum para o mesmo chunk, criando arestas artificiais nos dois sentidos.

## Correção

- `@remix-run/router` compõe explicitamente `vendor-react`;
- famílias centrais continuam classificadas de forma estável;
- dependências não classificadas retornam `undefined` para que o Rollup determine sua fronteira natural;
- o fallback artificial `vendor-misc` é proibido;
- avisos `CIRCULAR_CHUNK` e mensagens `Circular chunk:` abortam o build;
- o gate pós-build lê os imports estáticos dos arquivos JavaScript gerados;
- ciclos no grafo real de chunks bloqueiam a entrega;
- os chunks centrais `vendor-react`, `vendor-query` e `vendor-supabase` são obrigatórios;
- permanece o limite máximo de 500 KiB por arquivo JavaScript.

## Garantias

A fase não altera dependências, comportamento de aplicação ou regras de lazy loading. Ela corrige somente a fronteira dos chunks e torna regressões observáveis no CI.

Pacotes sem classificação explícita não são misturados em um chunk genérico. Eles permanecem sob propriedade do algoritmo de chunking do Rollup, que pode agrupá-los com seus consumidores sem introduzir dependências artificiais entre famílias manuais.

## Evidência automatizada

- `vite.config.ts` bloqueia avisos circulares e proíbe `vendor-misc`;
- `scripts/check-build-chunks.mjs` valida tamanho, chunks obrigatórios e aciclicidade;
- `scripts/check-chunk-graph-contract.mjs` protege a configuração B32;
- o gate integral continua executando lint, banco, pgTAP, tipos, TypeScript, audit e build.

# Fase B52 — Baseline de testes unitários do frontend

## Objetivo

Introduzir a primeira camada real de testes automatizados do frontend e torná-la bloqueante no desenvolvimento local e no CI.

## Diagnóstico anterior

O repositório possuía pgTAP, contratos estáticos, lint, TypeScript e build, mas não possuía:

- test runner de frontend;
- script `test`;
- arquivos `.test.ts` ou `.spec.ts`;
- etapa de testes unitários no workflow;
- resultado de testes unitários na issue de evidência.

Essa lacuna mantinha funções TypeScript críticas protegidas apenas por análise estática e uso indireto.

## Dependência

Foi fixado `vitest@4.1.10` como dependência de desenvolvimento exata. A resolução de `package.json` e `package-lock.json` foi gerada pelo npm no runner oficial, sem edição manual do lockfile.

O projeto já utiliza Vite 6.4.3 e Node 22.16.0, atendendo aos requisitos da versão adotada.

## Configuração

O arquivo `vitest.config.ts` define:

- ambiente `node`;
- descoberta restrita a `src/**/*.test.ts`;
- falha quando nenhum teste é encontrado;
- limpeza, reset e restauração de mocks;
- timeout unitário de cinco segundos;
- alias `@` consistente com a aplicação.

A configuração participa do `tsconfig.node.json`.

## Primeira suíte

`src/lib/date-time.test.ts` protege os contratos de `src/lib/date-time.ts`:

- locale `pt-BR`;
- timezone `America/Sao_Paulo`;
- fallbacks para entradas ausentes ou inválidas;
- conversão para ISO UTC;
- formatação de data e hora no timezone da aplicação;
- limites entre segundos, minutos, horas, dias, meses e anos no tempo relativo.

Os testes usam instantes fixos e não dependem do relógio atual, timezone do runner ou rede.

## Scripts

- `npm test` delega para `npm run test:unit`;
- `npm run test:unit` executa `vitest run --config vitest.config.ts` sem watch;
- `npm run check:unit-tests` valida a permanência da infraestrutura B52;
- `npm run check` executa testes unitários antes do TypeScript e do build.

## Integração no CI

O workflow permanente executa uma etapa própria `Testes unitários` após instalação e lint. O resultado:

- participa da classificação da evidência;
- aparece no corpo da issue automática;
- é exigido pelo gate final;
- mantém a issue aberta se houver `failure`;
- participa da classificação `not_planned` caso a execução seja interrompida sem falha explícita.

## Contrato permanente

`scripts/check-unit-test-baseline.mjs` valida:

- versão exata do Vitest no manifesto e lockfile;
- scripts de teste;
- configuração Node;
- existência e conteúdo mínimo da suíte;
- inclusão da configuração no TypeScript;
- integração do resultado unitário no workflow;
- ausência do instalador temporário.

## Escopo excluído

Esta fase não adiciona:

- DOM simulado;
- Testing Library;
- snapshots de componentes;
- browser automation;
- testes E2E.

Essas camadas devem ser introduzidas separadamente quando houver fluxos e componentes selecionados por risco.

## Banco e ambientes

- nenhuma migration criada ou aplicada;
- nenhum dado alterado;
- nenhuma Edge Function alterada;
- Supabase `dev` inalterado;
- Supabase `main` e branch GitHub `main` inalterados.

## Critérios de aceite

- instalação limpa reproduzível;
- suíte unitária aprovada;
- lint aprovado;
- banco e pgTAP aprovados;
- tipos sincronizados;
- TypeScript aprovado;
- build aprovado;
- evidência automática contendo o resultado unitário;
- instalador temporário removido.

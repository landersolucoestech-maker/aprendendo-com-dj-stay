# Fase B46 — Determinismo e compatibilidade do CI

## Objetivo

Eliminar versões flutuantes e actions baseadas em runtimes obsoletos no workflow técnico da branch `dev`, preservando banco local, pgTAP, geração automática de tipos, TypeScript, build e evidência por issue.

## Workflow

Arquivo: `.github/workflows/baseline.yml`.

Versões adotadas:

- runner: `ubuntu-24.04`;
- Node.js do projeto: `22.16.0`;
- npm: controlado por `packageManager` e engines do `package.json`;
- `actions/checkout@v6`;
- `actions/setup-node@v6`;
- Supabase CLI `2.101.0`, executada por `npx --yes supabase@2.101.0`;
- `actions/upload-artifact@v7`;
- `actions/github-script@v9`.

A action `supabase/setup-cli@v1` foi removida porque ainda dependia do runtime Node.js 20. A CLI passa a ser obtida pelo pacote oficial em versão exata, e todas as chamadas usam a mesma variável `SUPABASE_CLI_VERSION`.

A Supabase CLI foi fixada numa versão específica porque migrations, imagens locais e tipos gerados podem mudar mesmo dentro do mesmo major. Atualizações futuras devem ser deliberadas, com reconstrução integral do banco e execução de todos os testes pgTAP.

## Comportamento preservado

- instalação limpa com `npm ci`;
- lint;
- verificação da versão da Supabase CLI;
- inicialização e reset do Supabase local;
- 57 arquivos pgTAP e 1.394 asserções na baseline desta fase;
- geração e sincronização automática de `src/integrations/supabase/types.ts`;
- commit automático de tipos com `[skip ci]` quando houver diferença;
- typecheck completo;
- build de desenvolvimento;
- artefato temporário dos tipos gerados;
- issue automática com evidência de cada etapa;
- gate final que falha quando qualquer etapa obrigatória não conclui com sucesso.

## Gate estático

`scripts/check-ci-determinism.mjs` exige:

- Supabase CLI `2.101.0` pinada;
- ausência de `version: latest`;
- ausência de `supabase/setup-cli`;
- `actions/checkout@v6`;
- `actions/setup-node@v6`;
- `actions/upload-artifact@v7`;
- `actions/github-script@v9`;
- workflow técnico contendo Supabase, pgTAP e typecheck.

O gate é executado por `npm run check:ci-determinism` dentro de `npm run typecheck`.

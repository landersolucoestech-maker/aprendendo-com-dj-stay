# Fase B46 — Determinismo e compatibilidade do CI

## Objetivo

Eliminar versões flutuantes e actions baseadas em runtimes obsoletos no workflow técnico da branch `dev`, preservando banco local, pgTAP, geração automática de tipos, TypeScript, build e evidência por issue.

## Workflow

Arquivo: `.github/workflows/baseline.yml`.

Versões adotadas:

- runner: `ubuntu-24.04`;
- Node.js do projeto: `22.16.0`;
- npm: controlado por `packageManager` e engines do `package.json`;
- `actions/checkout@v5`;
- `actions/setup-node@v6`;
- `supabase/setup-cli@v1` com Supabase CLI `2.101.0`;
- `actions/upload-artifact@v5`;
- `actions/github-script@v8`.

A Supabase CLI foi fixada numa versão estável específica porque migrations, imagens locais e tipos gerados podem mudar mesmo dentro do mesmo major. Atualizações futuras devem ser feitas deliberadamente, com reconstrução integral do banco e execução de todos os testes pgTAP.

## Comportamento preservado

- instalação limpa com `npm ci`;
- lint;
- inicialização e reset do Supabase local;
- 57 arquivos pgTAP;
- geração e sincronização automática de `src/integrations/supabase/types.ts`;
- commit automático de tipos com `[skip ci]` quando houver diferença;
- typecheck completo;
- build de desenvolvimento;
- artefato temporário dos tipos gerados;
- issue automática com evidência de cada etapa;
- gate final que falha quando qualquer etapa obrigatória não conclui com sucesso.

## Gate estático

`scripts/check-ci-determinism.mjs` bloqueia:

- `version: latest` para a Supabase CLI;
- `actions/checkout@v4`;
- `actions/setup-node@v4`;
- `actions/upload-artifact@v4`;
- ausência do workflow técnico com Supabase, pgTAP e typecheck.

O gate é executado por `npm run check:ci-determinism` dentro de `npm run typecheck`.

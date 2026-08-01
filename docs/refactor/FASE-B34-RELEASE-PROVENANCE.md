# Fase B34 — Proveniência imutável de release

## Problema observado

A observabilidade do frontend registrava `VITE_APP_RELEASE`, o modo do Vite ou `unknown`. Esses valores não garantem vínculo entre incidente, bundle e revisão do repositório.

## Resolução

A revisão do build é resolvida nesta ordem:

1. `VITE_APP_RELEASE`, quando fornecida como identificador imutável explícito;
2. `GITHUB_SHA`, no GitHub Actions;
3. `git rev-parse HEAD`, em builds locais dentro do repositório.

Um build sem revisão válida é bloqueado. O servidor de desenvolvimento pode usar um identificador local explícito apenas para execução interativa, nunca como artefato de entrega.

## Artefato

Cada build gera `dist/release.json` com:

- versão do schema;
- nome e versão do pacote;
- revisão imutável;
- ambiente lógico.

O manifesto não possui timestamp. Assim, não introduz variação artificial em builds executados sobre a mesma revisão e configuração.

## Runtime

O Vite injeta `__APP_RELEASE__` e `__APP_ENVIRONMENT__` no bundle. A captura de erros B31 utiliza exatamente `__APP_RELEASE__`, vinculando cada incidente ao mesmo identificador publicado em `release.json`.

## Validação

O gate B34 confirma:

- resolução da revisão por fonte permitida;
- rejeição de `unknown`, nomes de modo e fallbacks genéricos em build;
- correspondência com `GITHUB_SHA`, override explícito ou HEAD Git local;
- correspondência entre pacote e manifesto;
- incorporação da mesma revisão nos arquivos JavaScript compilados;
- ausência de timestamp variável no contrato do manifesto.

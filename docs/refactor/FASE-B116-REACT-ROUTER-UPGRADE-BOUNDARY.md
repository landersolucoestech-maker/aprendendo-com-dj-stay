# FASE B116 — Limite de atualização do React Router

## Contexto

A aplicação usa `react-router-dom@6.30.4` exclusivamente em modo declarativo. A linha `react-router >= 7.12.0 < 8.3.0` está abrangida pelo advisory `GHSA-qwww-vcr4-c8h2`, corrigido em `8.3.0`. O advisory alcança APIs RSC instáveis, que não existem neste projeto.

Uma atualização isolada para a linha 7 aumentaria a severidade reportada sem corrigir integralmente a dependência. A migração segura deverá ocorrer diretamente para `react-router@8.3.0` ou superior e ser coordenada com os requisitos mínimos oficiais de Node e React.

## Decisão

A branch `dev` preserva temporariamente a baseline declarativa atual e bloqueia atualizações parciais. A futura migração deverá incluir:

- `react-router@8.3.0` ou superior;
- remoção de `react-router-dom`;
- migração dos imports para `react-router` e, quando aplicável, `react-router/dom`;
- Node 22.22 ou superior;
- React e React DOM 19.2.7 ou superiores;
- revisão das peer dependencies;
- lockfile determinístico;
- auditoria, lint, testes, TypeScript, build e smoke HTTP aprovados.

## Gate

O contrato `scripts/check-react-router-upgrade-boundary.mjs` valida a baseline atual, o limite machine-readable, a versão mínima corrigida, os requisitos da futura migração e a ausência de RSC, SSR, Data Router ou Framework Mode.

A exceção atual continua limitada aos advisories já observados e ao prazo de revisão. Qualquer mudança no `npm audit` bloqueia a pipeline.

## Exclusões

- Nenhuma migration foi criada ou alterada.
- O Supabase remoto não foi modificado.
- A branch `main` não foi alterada.
- Nenhuma dependência ou lockfile foi alterado nesta fase.
- A aprovação em `dev` não equivale a homologação externa ou promoção para produção.

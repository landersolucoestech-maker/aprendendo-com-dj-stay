# FASE B25 — Performance frontend

## Baseline

Antes desta fase, o `App.tsx` importava todas as páginas de forma eager. O build de desenvolvimento gerava um chunk JavaScript principal de aproximadamente 1,69 MB, acima do limite de alerta de 500 kB do Vite.

O problema não era corrigível aumentando o limite: a aplicação transferia código de administração, portal do aluno, afiliados, marketplace, autenticação e páginas públicas no primeiro carregamento, independentemente da rota acessada.

## Lazy loading por domínio

As superfícies foram registradas em módulos lazy separados:

- `src/routing/lazy/public-pages.ts`;
- `src/routing/lazy/auth-pages.ts`;
- `src/routing/lazy/student-pages.ts`;
- `src/routing/lazy/commerce-pages.ts`;
- `src/routing/lazy/affiliate-pages.ts`;
- `src/routing/lazy/admin-pages.ts`.

O `App.tsx` não importa mais páginas diretamente. Cada página é carregada por `React.lazy()` somente quando sua rota é renderizada. Os guards de autenticação e papel continuam envolvendo as mesmas rotas e permanecem executados antes da superfície protegida.

## Suspense e tolerância a falhas

O roteamento possui:

- `RouteLoadingFallback`, com `aria-busy`, `role="status"` e texto explícito;
- `RouteErrorBoundary`, que isola falhas de renderização na rota;
- recuperação automática do boundary quando o pathname ou query string muda;
- ação de recarregar e retorno ao início;
- preservação do boundary de acessibilidade e do foco por rota da FASE B24.

O Error Boundary não converte erros de autorização em sucesso nem altera dados. Ele trata apenas falhas não capturadas de carregamento ou renderização.

## React Query

A política global foi explicitada:

- dados permanecem frescos por 60 segundos;
- cache inativo é coletado após 10 minutos;
- consultas repetem uma única vez;
- respostas HTTP 4xx não recuperáveis não são repetidas;
- timeout, rate limit e falhas 5xx podem ser repetidos;
- reconexão revalida consultas;
- foco da janela não dispara refetch automático;
- mutações nunca são repetidas automaticamente;
- structural sharing permanece habilitado.

Hooks de domínio continuam livres para sobrescrever essas opções quando houver requisito específico e documentado.

## Separação de chunks

O Vite separa dependências estáveis em grupos:

- React e roteamento;
- TanStack Query;
- Supabase;
- Radix UI;
- gráficos;
- formulários e validação;
- utilitários de interface;
- dependências residuais.

`cssCodeSplit` permanece habilitado e `chunkSizeWarningLimit` permanece em 500 kB. O limite não foi elevado para ocultar o problema.

## Orçamento executável

O script `scripts/check-build-chunks.mjs` roda após os builds de produção e desenvolvimento.

Ele exige:

- ao menos oito chunks JavaScript;
- nenhum chunk JavaScript acima de 500 KiB;
- diretório de build válido;
- relatório ordenado de tamanho para evidência no CI.

O script `scripts/check-frontend-performance-contract.mjs` bloqueia regressões arquiteturais, incluindo imports eager de páginas no `App.tsx`, remoção do Suspense, Error Boundary, política explícita do React Query, chunks manuais e orçamento pós-build.

## Limites

Esta fase não altera schema, RLS, Edge Functions, autenticação ou regras de negócio. Nenhuma alteração foi realizada fora da branch GitHub `dev`.

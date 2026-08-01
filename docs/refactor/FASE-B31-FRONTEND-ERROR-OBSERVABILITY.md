# Fase B31 — Observabilidade de erros do frontend

## Objetivo

Substituir a dependência exclusiva de `console.error` por um fluxo persistente, restrito e tratável para falhas não capturadas do frontend.

## Fontes capturadas

- `route_boundary`: falhas isoladas pelo `RouteErrorBoundary`;
- `window_error`: erros globais emitidos pelo navegador;
- `unhandled_rejection`: promises rejeitadas sem tratamento.

## Segurança e privacidade

- somente sessões autenticadas podem registrar incidentes;
- usuários anônimos não executam as RPCs;
- a tabela não possui grants diretos para `anon` ou `authenticated`;
- RLS permanece habilitada e forçada com policy restritiva de negação direta;
- funções privadas são `SECURITY DEFINER`, com wrappers públicos `SECURITY INVOKER`;
- e-mails, JWTs e bearer tokens são removidos no cliente e novamente no banco;
- rotas não armazenam query string, fragmento, UUID ou identificador numérico longo;
- nenhum IP ou user-agent bruto é persistido;
- metadados, mensagem e pilha possuem limites rígidos.

## Operação

A rota `/admin/erros` é exclusiva de `administrador_proprietario` e permite:

- filtrar por status, origem e rota;
- reconhecer um incidente;
- resolver com nota obrigatória;
- ignorar com justificativa obrigatória;
- reabrir um incidente.

## Evidência automatizada

- migrações `20260801040000` e `20260801040100`;
- pgTAP `46_frontend_error_observability.test.sql`;
- contrato estático `check-frontend-error-observability.mjs`;
- gate completo de lint, banco, tipos, TypeScript, audit, build e chunks.

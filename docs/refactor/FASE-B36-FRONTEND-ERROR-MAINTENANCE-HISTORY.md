# FASE B36 — Histórico administrativo de manutenção

## Objetivo

Permitir que o administrador proprietário consulte as execuções de retenção registradas pela FASE B35 sem receber acesso direto à tabela `frontend_error_maintenance_events`.

## Banco de dados

A RPC privada `private.get_frontend_error_maintenance_history`:

- exige sessão autenticada e papel `administrador_proprietario`;
- usa `SECURITY DEFINER` com `search_path` vazio;
- limita cada página a no máximo 200 registros;
- normaliza offsets negativos para zero;
- retorna `total`, `limit`, `offset` e `events`;
- ordena por `created_at DESC, id DESC` para paginação estável.

A wrapper pública `public.get_frontend_error_maintenance_history` é `SECURITY INVOKER`. `anon` não possui `EXECUTE`; `authenticated` pode chamar a wrapper, mas a função privada mantém a guarda administrativa.

## Segurança

- A tabela permanece com RLS forçada.
- `anon` e `authenticated` continuam sem grants diretos na tabela.
- O histórico não expõe IP, user-agent, token ou conteúdo dos incidentes apagados.
- Cada item contém somente ator, política de retenção, corte, quantidade afetada, metadados limitados e data da execução.

## Frontend

- `frontendErrorMaintenanceHistorySchema` valida a resposta.
- `useFrontendErrorMaintenanceHistory` mantém cache paginado independente.
- `FrontendErrorMaintenanceHistory` apresenta as últimas 20 execuções na área administrativa.

## Evidências

- Migration: `20260801060000_frontend_error_maintenance_history.sql`.
- pgTAP: `48_frontend_error_maintenance_history.test.sql`.
- Contrato estático: `check-frontend-error-maintenance-history.mjs`.

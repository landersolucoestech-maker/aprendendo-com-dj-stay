# FASE B30 — Hardening orientado pelos advisors do banco

## Objetivo

Eliminar alertas acionáveis dos advisors de segurança e performance do Supabase sem abrir acesso direto a tabelas internas nem remover índices sem evidência de carga real.

## Políticas de certificados

As políticas `certificates_select` e `certificate_events_select` preservam as mesmas regras de autorização:

- administrador proprietário pode consultar todos os registros;
- aluno pode consultar apenas seus próprios certificados e eventos relacionados.

As funções `private.current_user_role()` e `auth.uid()` passaram a ser chamadas por subconsultas escalares. O PostgreSQL pode avaliá-las como initplans uma vez por statement, evitando reavaliação por linha.

## Domínio de contato

`contact_messages` e `contact_message_events` continuam sem qualquer grant para `anon` ou `authenticated`.

Foram adicionadas políticas `RESTRICTIVE FOR ALL` com `USING (false)` e `WITH CHECK (false)` para tornar explícito que acesso direto é proibido. Toda operação permanece concentrada nas funções privadas `SECURITY DEFINER`, chamadas por wrappers públicos `SECURITY INVOKER` com grants mínimos de execução.

As tabelas e funções privadas pertencem ao papel `postgres`, que possui `BYPASSRLS`. Portanto, `FORCE ROW LEVEL SECURITY` e as políticas restritivas não interrompem os RPCs confiáveis.

## Advisors após a migração

No projeto Supabase `dev`:

- nenhum advisor de segurança permanece;
- os avisos `auth_rls_initplan` foram eliminados;
- permanecem apenas informações de índices ainda não observados e da estratégia de conexões do Auth.

## Decisão sobre índices

Nenhum índice foi removido. O ambiente `dev` ainda não possui tráfego representativo, então `idx_scan = 0` não comprova inutilidade. Índices de chaves estrangeiras, auditoria, filas, pagamentos, certificados e autorização não devem ser removidos sem:

1. janela real de observação;
2. estatísticas após carga representativa;
3. análise de planos `EXPLAIN (ANALYZE, BUFFERS)`;
4. confirmação de que nenhuma consulta, FK ou rotina operacional depende deles.

## Evidência automatizada

- Migração: `supabase/migrations/20260801030000_database_advisor_hardening.sql`
- Testes: `supabase/tests/45_database_advisor_hardening.test.sql`
- Contratos existentes de certificados e contatos continuam ativos.

# Fase B44 — Solicitações de direitos de privacidade

## Objetivo

Disponibilizar um fluxo persistente, seguro e auditável para que o aluno exerça direitos relacionados aos próprios dados, sem executar exclusões automáticas ou permitir acesso direto às tabelas.

## Escopo implementado

O aluno pode registrar solicitações de:

- acesso e exportação;
- correção de dados;
- análise para exclusão de dados.

O aluno pode acompanhar o histórico e cancelar somente solicitações que ainda estejam no estado `submitted`.

A administração pode filtrar solicitações, iniciar análise, concluir ou rejeitar. Rejeições exigem justificativa. Solicitações finalizadas ou canceladas não podem ser reabertas pelas RPCs desta fase.

## Estados e transições

- `submitted` → `in_review`, `completed`, `rejected` ou `cancelled` pelo próprio aluno;
- `in_review` → `completed` ou `rejected`;
- `completed`, `rejected` e `cancelled` são estados finais.

A exclusão de conta, registros financeiros, registros de segurança ou qualquer outro dado não ocorre automaticamente. A solicitação apenas cria e acompanha o processo administrativo.

## Segurança

- RLS habilitada e forçada nas tabelas de solicitações e eventos;
- política restritiva de negação de acesso direto;
- nenhum grant de tabela para `anon` ou `authenticated`;
- funções privadas `SECURITY DEFINER` com `search_path` vazio;
- wrappers públicos `SECURITY INVOKER`;
- isolamento do aluno por `auth.uid()`;
- operações administrativas restritas a `administrador_proprietario`;
- eventos imutáveis para criação, cancelamento e mudança de status;
- prevenção de duas solicitações abertas do mesmo tipo para o mesmo usuário.

## Interface

- aluno: `/aluno/privacidade`;
- administração: `/admin/privacidade`.

## Verificação

- migration `20260802000000_privacy_rights_requests.sql`;
- pgTAP `56_privacy_rights_requests.test.sql` com 30 asserções;
- contratos Zod e cliente RPC tipado;
- hooks React Query para aluno e administração;
- gate estático `check:privacy-rights-requests`;
- gate integral de lint, banco, tipos, TypeScript e build.

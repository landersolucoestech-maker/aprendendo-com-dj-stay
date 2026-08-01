# FASE B39 — suporte por tickets

## Objetivo

Substituir suporte informal por tickets autenticados, persistentes e auditáveis, com uma conversa única entre aluno e administração.

## Segurança

- as tabelas `support_tickets`, `support_ticket_messages` e `support_ticket_events` usam RLS habilitada e forçada;
- `anon` e `authenticated` não possuem grants diretos nas tabelas;
- o aluno não informa `user_id`: as RPCs usam exclusivamente `auth.uid()`;
- o painel administrativo exige `administrador_proprietario`;
- os wrappers públicos são `security invoker`; o núcleo privado é `security definer` com `search_path` vazio;
- tickets encerrados não aceitam novas mensagens do aluno;
- criação e respostas usam chaves de idempotência.

## Fluxo do aluno

A rota `/aluno/suporte` permite:

1. abrir ticket com assunto, categoria, prioridade e mensagem inicial;
2. acompanhar referência, status, prioridade e histórico de mensagens;
3. responder enquanto o ticket não estiver encerrado.

Toda resposta do aluno move o ticket para `awaiting_support`.

## Fluxo administrativo

A rota `/admin/suporte` permite:

- pesquisar por referência, assunto ou email;
- filtrar por status e prioridade;
- visualizar toda a conversa;
- responder e definir o próximo status;
- resolver ou encerrar o ticket de forma auditável.

## Status

- `open`;
- `awaiting_support`;
- `awaiting_student`;
- `resolved`;
- `closed`.

## Auditoria

`support_ticket_events` registra criação, mensagens e mudanças de status. Nenhuma alteração operacional ocorre diretamente nas tabelas pelo navegador.

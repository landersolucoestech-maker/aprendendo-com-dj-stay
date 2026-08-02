# FASE B43 — Índices de chaves estrangeiras do suporte

## Objetivo

Eliminar os avisos objetivos de chaves estrangeiras sem índice emitidos pelo advisor de performance do Supabase para o domínio de suporte.

## Alterações

- `support_ticket_messages_author_user_idx` cobre `support_ticket_messages.author_user_id`;
- `support_ticket_events_actor_user_idx` cobre `support_ticket_events.actor_user_id`;
- ambos são índices parciais e ignoram valores nulos;
- nenhuma tabela, política, RPC ou regra funcional foi alterada.

## Decisão sobre índices não usados

O advisor também classifica diversos índices como ainda não usados. Esses avisos não justificam remoção em um banco de desenvolvimento recém-criado, porque ainda não existe carga representativa. A fase remove apenas os dois avisos de `unindexed_foreign_keys`, que representam uma lacuna estrutural verificável.

## Validação

- migration `20260801233000_support_foreign_key_indexes.sql`;
- pgTAP `55_support_foreign_key_indexes.test.sql`;
- advisor de performance sem os dois avisos anteriores;
- gate estático `check-support-foreign-key-indexes.mjs`.

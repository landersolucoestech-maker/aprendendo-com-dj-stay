# FASE B41 — Favoritos de cursos e produtos digitais

## Objetivo

Permitir que o aluno salve cursos e produtos digitais publicados para acesso posterior, sem interferir em matrícula, checkout, entitlement ou entrega.

## Segurança

- A tabela `student_favorites` usa RLS habilitada e forçada.
- Não existem grants diretos para `anon` ou `authenticated`.
- Uma política restritiva bloqueia acesso SQL direto.
- Todas as operações são vinculadas a `auth.uid()` e não aceitam `user_id`.
- As RPCs públicas são `SECURITY INVOKER`; o núcleo privado é `SECURITY DEFINER` com `search_path` vazio.
- Apenas cursos e produtos digitais com status `published` e sem `deleted_at` podem ser favoritados.

## Integridade

A chave única `(user_id, subject_type, subject_id)` impede duplicações. A alternância remove o registro existente ou cria um novo favorito; itens arquivados ou excluídos deixam de aparecer na listagem.

## Interface

- rota protegida `/aluno/favoritos`;
- item Favoritos na navegação do aluno;
- botão reutilizável `FavoriteToggleButton`;
- integração nos cards do marketplace;
- listagem com tipo, título, data e link para o item.

## Validação

- migration aplicada somente no Supabase `dev`;
- 24 asserções pgTAP;
- contratos Zod, cliente RPC e hooks React Query;
- contrato estático integrado ao `typecheck`.

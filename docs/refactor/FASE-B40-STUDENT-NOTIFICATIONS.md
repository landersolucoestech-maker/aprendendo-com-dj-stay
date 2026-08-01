# FASE B40 — Notificações transacionais do aluno

## Objetivo

Disponibilizar notificações persistentes apenas para eventos reais da plataforma, sem alertas genéricos ou dados inventados.

## Segurança

- A tabela `student_notifications` usa RLS habilitada e forçada.
- Não existem grants diretos para `anon` ou `authenticated`.
- Uma política restritiva bloqueia acesso SQL direto.
- A leitura e as marcações usam `auth.uid()` e não aceitam argumento `user_id`.
- O criador interno de notificações não pode ser executado por usuários autenticados.
- As RPCs públicas são `SECURITY INVOKER`; o núcleo privado é `SECURITY DEFINER` com `search_path` vazio.

## Eventos

Tipos suportados:

- resposta do suporte;
- pagamento confirmado;
- acesso concedido;
- certificado emitido;
- comunicação sistêmica.

A primeira integração automática é a resposta administrativa em tickets de suporte. A função privada idempotente pode ser reutilizada pelos fluxos de pagamento, acesso e certificados.

## Interface

A rota protegida `/aluno/notificacoes` oferece:

- listagem ordenada;
- contador de não lidas;
- marcação individual;
- marcação em lote;
- navegação para a origem da notificação.

## Validação

- migration versionada e aplicada somente no Supabase `dev`;
- 24 asserções pgTAP;
- contratos Zod e cliente RPC tipado;
- hooks React Query;
- contrato estático integrado ao `typecheck`.

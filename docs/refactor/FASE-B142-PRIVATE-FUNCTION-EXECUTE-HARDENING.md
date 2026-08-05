# FASE B142 — Hardening de execução das funções privadas

## Objetivo

Eliminar privilégios de execução herdados por `PUBLIC` nas funções do schema `private`, preservar somente os consumidores legítimos e bloquear a reintrodução do mesmo defeito em funções futuras.

## Escopo

- GitHub: `landersolucoestech-maker/aprendendo-com-dj-stay`, branch `dev`;
- Supabase remoto de desenvolvimento: branch `dev`, project ref `jmtyurketfclaneqxohu`;
- projeto Supabase principal `tduvfrxagujryfnqpdmc` e branch GitHub `main`: sem alterações.

## Reconexão do ambiente

O project ref `jmtyurketfclaneqxohu` é uma branch Supabase de desenvolvimento do projeto principal `tduvfrxagujryfnqpdmc`. A consulta direta como projeto principal retorna `Project not found`; a resolução correta ocorre pelo inventário de branches do projeto pai.

A branch foi confirmada com:

- nome: `dev`;
- status de branch: `FUNCTIONS_DEPLOYED`;
- preview project status: `ACTIVE_HEALTHY`;
- Edge Functions `media-playback`, `asaas-webhook` e `create-asaas-checkout` ativas.

## Bloqueio do E2E positivo de playback

A branch remota não contém massa operacional:

- zero usuários de Auth;
- zero cursos, módulos e aulas;
- zero mídias de aula e assets;
- zero matrículas;
- zero tokens e eventos de playback.

Nenhum dado artificial foi criado apenas para fabricar uma prova positiva. A reprodução autenticada de mídia real continua pendente até existir um usuário, uma matrícula e uma aula com mídia válidos no ambiente de desenvolvimento.

## Achado

O schema `private` continha 207 funções. Cinquenta e quatro funções tinham `EXECUTE` efetivo para `PUBLIC`, por ACL explícita ou pelo privilégio padrão do PostgreSQL.

A superfície incluía funções `SECURITY DEFINER` de currículo, suporte, privacidade e pagamento. Probes transacionais confirmaram que as verificações internas falhavam fechado:

- chamada anônima de `private.create_module` terminou com `ADMIN_REQUIRED`;
- chamada anônima de `private.confirm_course_purchase` terminou com `SERVICE_ROLE_REQUIRED`.

Isso evitava exploração direta dos dois fluxos testados, mas não justificava manter um privilégio genérico sobre funções privadas.

Também foi comprovado que:

- não havia wrapper público anônimo dependente dessas 54 funções;
- nenhuma política RLS dependia da execução por `PUBLIC`;
- os consumidores legítimos eram `authenticated` e `service_role`;
- o schema `private` não é exposto pelo Data API por padrão, mas o privilégio continuava excessivo dentro do PostgreSQL.

## Correção

A migration `20260805015339_private_function_execute_hardening.sql`:

1. revoga globalmente o `EXECUTE` padrão de `PUBLIC` para novas funções criadas pelo papel `postgres`;
2. identifica as funções existentes do schema `private` ainda executáveis por `PUBLIC`;
3. concede explicitamente `EXECUTE` a `authenticated` e `service_role` nesses alvos;
4. revoga `EXECUTE` de `PUBLIC` em cada alvo.

As quatro funções privadas intencionalmente anônimas permanecem explicitamente concedidas a `anon`, sem depender de `PUBLIC`:

- `get_public_course_catalog`;
- `record_affiliate_click`;
- `submit_contact_message`;
- `validate_certificate_code`.

## Evidências

Após a migration:

- funções privadas executáveis por `PUBLIC`: `0`;
- funções privadas executáveis por `anon`: `4`, todas com grant explícito e finalidade pública;
- funções privadas executáveis por `authenticated`: `146`;
- funções privadas executáveis por `service_role`: `121`;
- ACL padrão global de funções criadas por `postgres`: sem `PUBLIC EXECUTE`;
- função privada temporária criada após o hardening: sem execução por `PUBLIC`, `anon`, `authenticated` ou `service_role`;
- wrapper autenticado `public.create_module` continuou alcançando a barreira de domínio e terminou com `ADMIN_REQUIRED` para uma sessão sem papel proprietário;
- wrapper financeiro com `service_role` continuou alcançando a validação de domínio e terminou com `STUDENT_ROLE_REQUIRED` para UUID inexistente;
- advisor de segurança do Supabase: zero lints.

O teste `supabase/tests/private_function_execute_hardening.test.sql` possui 11 asserções e foi executado transacionalmente contra o Supabase remoto `dev` sem falhas.

## Limitações

Esta fase não declara como concluído:

- E2E autenticado de reprodução;
- streaming de objeto privado real;
- compra, reembolso ou chargeback no sandbox Asaas;
- teste de carga;
- pentest;
- promoção para produção.

## Resultado

A execução genérica por `PUBLIC` foi removida de todas as funções privadas existentes, os consumidores legítimos foram preservados por grants explícitos e novas funções criadas por `postgres` passam a nascer fechadas. A branch `main` e o projeto principal de produção permaneceram intactos.

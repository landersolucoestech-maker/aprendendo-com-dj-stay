# FASE A5 — Banco de dados e migrations

Status: concluída para repositório, Supabase `dev` e produção; projeto legado bloqueado por permissão.

## Comparação

| Fonte | Estado |
| --- | --- |
| migrations locais | 7 arquivos |
| migrations registradas em `dev` | 0 |
| schema `public` real de `dev` | vazio |
| migrations registradas em produção | 1 (`20260729020100 remote_schema`) |
| schema `public` real de produção | vazio |
| tipos TypeScript versionados | 6 tabelas e 1 função do legado |
| tipos gerados de `dev` | schema `public` vazio |
| tipos gerados de produção | schema `public` vazio |
| projeto legado | inacessível pela conexão atual |

## Objetos descritos pelos tipos legados

- `aulas`;
- `lesson_files`;
- `modulos`;
- `progresso_aulas`;
- `user_profiles`;
- `user_subscriptions`;
- função `user_has_paid_access`.

## Achados

### AUD-DB-001 — Drift total entre código e ambientes atuais

Os hooks consultam tabelas inexistentes nos Supabase `dev` e produção. Os tipos versionados foram gerados de outro projeto.

### AUD-DB-002 — Migrations locais não reproduzem integralmente os tipos

A tabela `user_subscriptions` e a função `user_has_paid_access` aparecem nos tipos/histórico, mas não estão presentes no conjunto final de migrations locais comprovado.

### AUD-DB-003 — Migrations destrutivas e não idempotentes

Foram encontrados:

- `CREATE TABLE` sem `IF NOT EXISTS` no baseline;
- inserts de buckets sem proteção contra duplicidade;
- políticas com nomes conflitantes entre migrations;
- migration que apaga registros com `user_id IS NULL`;
- deduplicação por `ctid` antes de constraint;
- seed com UUID fixo dependente de registro externo;
- criação posterior de políticas que desfaz endurecimento anterior.

### AUD-DB-004 — RLS incompleta

- UPDATE de progresso possui `USING`, mas não `WITH CHECK`.
- algumas políticas usam apenas `TO authenticated`.
- `auth.role()` é utilizado em migrations de storage.
- materiais de aulas recebem leitura pública.
- última migration remove políticas autenticadas e recria leitura pública.

### AUD-DB-005 — Storage criado por migrations conflitantes

Os buckets `lesson-samples` e `lesson-projects` são inseridos mais de uma vez, com definições e policies diferentes.

### AUD-DB-006 — Produção contém objeto manual/remoto

Produção possui o event trigger `ensure_rls`, associado a `public.rls_auto_enable()`, sem equivalente em `dev` ou nas migrations locais.

A função:

- pertence a `postgres`;
- usa `SECURITY DEFINER`;
- restringe `search_path` a `pg_catalog`;
- habilita RLS em novas tabelas `public`;
- pode ser executada por `anon` e `authenticated`, segundo grants e Advisor.

### AUD-DB-007 — Ausência do modelo canônico

Não existem tabelas atuais para cursos, produtos, pedidos, pagamentos, afiliados, avaliações, certificados, auditoria ou concessões de acesso.

## Extensões atuais

Nos ambientes atuais estão instaladas as extensões padrão necessárias, incluindo `pgcrypto`, `uuid-ossp`, `pg_stat_statements` e Vault. Não foram encontradas extensões de domínio adicionais.

## Dados

- usuários Auth em `dev`: 0;
- usuários Auth em produção: 0;
- buckets em ambos: 0;
- dados de aplicação nos ambientes atuais: inexistentes.

Não foi feita leitura de dados pessoais do projeto legado.

## Recomendação estrutural

Reconstruir migrations canônicas e reproduzíveis, validar do zero, aplicar somente em Supabase `dev`, gerar tipos automaticamente e manter produção sem escrita até autorização explícita.

## Próxima fase sequencial

FASE A6 — Autenticação e autorização.
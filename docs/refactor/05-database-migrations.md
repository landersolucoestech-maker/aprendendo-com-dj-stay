# FASE B6 — Reconciliação do banco e migrations

Status: concluída em `dev` com reconstrução limpa, testes SQL, aplicação remota, tipos gerados e gate da aplicação aprovados.

## Estado anterior

- sete migrations locais contraditórias e não reproduzíveis;
- dados demonstrativos inseridos por migration;
- buckets públicos e policies duplicadas;
- escrita ampla por qualquer usuário autenticado;
- referências a `user_subscriptions` sem migration de criação;
- tipos gerados divergentes do schema real;
- `public` vazio em Supabase `dev` e produção.

## Decisão de reconciliação

Como não existiam objetos ou dados de negócio nos ambientes remotos, o histórico local defeituoso foi substituído por uma baseline única e canônica. O escopo desta fase ficou limitado ao domínio já consumido pelo frontend:

- módulos;
- aulas;
- progresso por aluno;
- perfil mínimo;
- metadados de arquivos de aula.

Storage, pagamentos, afiliados, matrículas, CMS administrativo e autorização por compra permanecem nas fases próprias.

## Controles da baseline

- constraints de integridade e limites;
- FKs com exclusão coerente;
- índices para joins e consultas de progresso;
- função de timestamp sem `SECURITY DEFINER` e com `search_path` fixo;
- RLS habilitada e forçada em todas as tabelas;
- grants mínimos;
- ownership para progresso e perfil;
- nenhuma seed ou URL fictícia;
- nenhum bucket criado;
- 20 testes pgTAP transacionais.

## Aplicação em `dev`

Migration registrada:

```text
20260730142308 canonical_learning_schema
```

Estado remoto após a aplicação:

- 5 tabelas em `public`;
- 0 registros;
- 0 buckets;
- 0 Edge Functions;
- RLS ativa nas 5 tabelas;
- nenhum alerta do advisor de segurança;
- produção permaneceu somente leitura.

## Tipos gerados

O arquivo `src/integrations/supabase/types.ts` foi substituído pelo contrato gerado automaticamente a partir do Supabase `dev`. Foram removidos do tipo:

- `user_subscriptions`;
- `user_has_paid_access`;
- `curso_id`;
- `criado_em`;
- nulabilidade incorreta de FKs e timestamps.

## Evidência automática

Commit validado:

```text
668304840e0b44fe48120b705253de05d5205eac
```

Workflow run: `30551616542`

| Etapa | Resultado |
| --- | --- |
| `npm ci` | success |
| `npm run lint` | success |
| Supabase CLI | success |
| `supabase start` | success |
| `supabase db reset --local` | success |
| `supabase test db` | success |
| geração de tipos TypeScript | success |
| `npm run typecheck` | success |
| `npm run build:dev` | success |

# FASE B6 — Reconciliação do banco e migrations

Status: baseline canônica preparada; reconstrução limpa e aplicação remota em `dev` ainda dependem dos gates registrados abaixo.

## Estado anterior

- sete migrations locais contraditórias e não reproduzíveis;
- dados demonstrativos inseridos por migration;
- buckets públicos e policies duplicadas;
- escrita ampla por qualquer usuário autenticado;
- referências a `user_subscriptions` sem migration de criação;
- tipos gerados divergentes do schema real;
- `public` vazio em Supabase `dev` e produção.

## Decisão de reconciliação

Como não existem objetos ou dados de negócio nos ambientes remotos, o histórico local defeituoso foi substituído por uma baseline única e canônica. O escopo desta fase é somente o domínio já consumido pelo frontend:

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
- testes pgTAP transacionais.

## Evidência anterior à persistência

A migration completa foi executada no Supabase `dev` dentro de uma transação explícita e encerrada com `ROLLBACK`. O teste retornou cinco tabelas criadas dentro da transação, demonstrando que o DDL e suas dependências são aceitos sem persistir objetos.

## Gates pendentes desta fase

1. reconstrução local do zero via Supabase CLI;
2. execução da suíte pgTAP;
3. aplicação da migration somente no Supabase `dev`;
4. inventário e advisors pós-migration;
5. geração automática dos tipos TypeScript;
6. lint, typecheck estrito e build.

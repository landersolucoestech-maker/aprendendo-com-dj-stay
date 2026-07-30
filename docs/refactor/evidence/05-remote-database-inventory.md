# Evidência — inventário remoto anterior à B6

Captura: 30 de julho de 2026, antes de qualquer DDL persistente.

## Supabase `dev` — `jmtyurketfclaneqxohu`

- relações de negócio em `public`: 0;
- funções de negócio em `public`: 0;
- policies em `public`: 0;
- usuários Auth: 0;
- buckets: 0;
- migrations registradas: 0;
- Edge Functions: 0;
- advisors de segurança: nenhum achado.

## Supabase produção — `tduvfrxagujryfnqpdmc`

Acesso exclusivamente de leitura.

- relações de negócio em `public`: 0;
- usuários Auth: 0;
- buckets: 0;
- migration registrada: `20260729020100_remote_schema`;
- a migration remota contém apenas extensões e grants padrão;
- função adicional `public.rls_auto_enable()` com `SECURITY DEFINER` e `search_path=pg_catalog`;
- event trigger `ensure_rls` associado à função;
- nenhuma alteração foi executada.

## Projeto legado

O projeto `uonsgcndzzuclcixoaei` continua inacessível pelas permissões disponíveis. A ausência de acesso permanece registrada como bloqueio de reconciliação histórica; nenhuma referência operacional ao legado foi reintroduzida.

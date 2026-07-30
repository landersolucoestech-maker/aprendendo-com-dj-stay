# FASE B4 — Configuração de GitHub, Supabase e ambientes

Status: implementação preparada; gate automático pendente.

## Escopo

- remover configuração Supabase hardcoded;
- centralizar configuração pública tipada;
- vincular desenvolvimento e produção aos project refs corretos;
- rejeitar combinações incompatíveis e chaves privilegiadas;
- impedir regressão por gate estático.

## Alterações preparadas

- origem única em `src/config/public-config.ts`;
- cliente Supabase sem URL ou chave própria;
- tipos de `ImportMetaEnv` explícitos;
- `supabase/config.toml` vinculado ao projeto `dev`;
- script `check:environment` integrado ao typecheck;
- documentação operacional atualizada;
- nenhuma chave persistida.

## Limites

- nenhuma migration aplicada;
- nenhuma alteração de Auth, Storage, policy, function ou registro;
- produção consultada somente para confirmar a existência de chave publicável ativa;
- configuração da plataforma de hospedagem permanece pendente até existir integração/deploy controlado.

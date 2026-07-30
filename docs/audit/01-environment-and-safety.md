# FASE A0 — Preparação, conexões e segurança

Status: concluída com limitações ambientais documentadas.

## Baseline confirmado

```text
Repositório: landersolucoestech-maker/aprendendo-com-dj-stay
Remote oficial: https://github.com/landersolucoestech-maker/aprendendo-com-dj-stay.git
Visibilidade: privado
Branch de produção: main
Branch de desenvolvimento: dev
HEAD original de main: b3a303caff9a19f231616b2b4d9fc65c2d8a557d
Criação de dev: criada exatamente a partir de main
Worktree local: não disponível no conector GitHub
Sistema operacional local: não validável sem checkout
Node.js: não validável sem checkout
Package manager declarado: inexistente no package.json
Lockfiles detectados: package-lock.json e bun.lockb
Supabase CLI: não validável sem checkout
Supabase dev: jmtyurketfclaneqxohu
Supabase produção: tduvfrxagujryfnqpdmc
Projeto legado referenciado: uonsgcndzzuclcixoaei
Timezone operacional definida pelo requisito: America/Sao_Paulo
```

## GitHub

- A conexão oficial possui permissões administrativas, de leitura e escrita.
- `main` permaneceu sem alterações.
- A branch `dev` não existia e foi criada exatamente a partir do HEAD de `main`.
- Nenhum force push, reset, rebase, merge ou exclusão foi executado.
- O checkout local não pôde ser criado porque o ambiente de terminal não resolveu `github.com`; por isso `git status`, arquivos ignorados locais, Node.js, package manager efetivamente instalado e Supabase CLI não puderam ser comprovados por terminal.
- Todas as escritas desta auditoria serão limitadas a `docs/audit` na branch `dev` até o encerramento formal do Estágio A.

## Supabase de desenvolvimento

```text
Branch: dev
Project ref: jmtyurketfclaneqxohu
Parent project ref: tduvfrxagujryfnqpdmc
Status: ACTIVE_HEALTHY
Com dados de produção: não
Tabelas public: 0
Policies: 0
Buckets: 0
Usuários Auth: 0
Edge Functions: 0
Migrations registradas: 0
```

O project ref de desenvolvimento é uma branch do projeto pai e não um projeto independente no catálogo principal.

## Supabase de produção

```text
Branch: main
Project ref: tduvfrxagujryfnqpdmc
Nome: DICA DE CRIA
Região: sa-east-1
Status: ACTIVE_HEALTHY
PostgreSQL: 17.6.1.147
Tabelas public: 0
Policies: 0
Buckets: 0
Usuários Auth: 0
Edge Functions: 0
Migrations registradas: 1 — 20260729020100 remote_schema
```

Produção foi consultada exclusivamente por operações de leitura. Nenhuma migration, seed, alteração de Auth, Storage, policy, secret, função ou registro foi executada.

## Projeto legado

O repositório referencia `uonsgcndzzuclcixoaei`, porém a conta Supabase conectada não possui permissão para consultar esse projeto. Portanto, não é possível concluir ainda se existem usuários, arquivos, tabelas, tráfego, secrets, callbacks ou recursos operacionais legados. A remoção ou substituição das referências permanece bloqueada até reconciliação documentada.

## Segurança inicial

- O código contém URL e chave publicável legadas hardcoded. O valor da chave não será reproduzido nos relatórios.
- O histórico contém um arquivo `.env` versionado com configuração do projeto legado.
- Produção contém `public.rls_auto_enable()`, função `SECURITY DEFINER` pertencente a `postgres`, associada ao event trigger ativo `ensure_rls`.
- A função usa `search_path=pg_catalog`, mas `anon` e `authenticated` possuem `EXECUTE`, gerando dois avisos de segurança do Supabase Advisor.
- Nenhum grant foi alterado nesta fase.

## Limitações

1. Ausência de checkout impede validação local completa, execução de build, lint, typecheck, testes e enumeração física integral do worktree.
2. O conector GitHub não expõe `git status` nem arquivos ignorados locais.
3. O projeto Supabase legado não está acessível pela conexão atual.
4. Não há dados de aplicação nos Supabase atuais para homologar fluxos funcionais.

## Registro da fase

```text
FASE CONCLUÍDA: A0 — Preparação, conexões e segurança

Escopo:
- Conexões GitHub e Supabase, branches, SHAs, ambientes, segurança e restrições.

Estado anterior:
- Branch GitHub dev inexistente.
- Supabase atual sem domínio da aplicação.
- Referências legadas presentes no repositório.

Itens analisados ou modificados:
- Repositório oficial, main, dev, projeto Supabase pai, branch dev, produção e projeto legado.

Achados ou correções:
- dev criada a partir de main.
- Produção preservada em somente leitura.
- Drift entre código legado e Supabase atual confirmado.
- Grants públicos em função SECURITY DEFINER de produção identificados.

Arquivos:
- Criado apenas este documento de auditoria.

Banco e migrations:
- Nenhuma alteração.

Comandos executados:
- Operações equivalentes de leitura pelos conectores GitHub e Supabase.
- Tentativa de acesso local ao GitHub falhou por resolução de rede.

Resultados e códigos de saída:
- Conectores GitHub e Supabase: sucesso.
- Terminal para acesso GitHub: falha de DNS, código 128.

Testes:
- Não aplicável nesta fase; execução local bloqueada.

Evidências:
- HEAD de main registrado.
- Branch dev criada.
- URLs, branches, catálogos, migrations, advisors e event trigger inspecionados.

Bloqueios:
- Projeto legado sem permissão.
- Checkout local indisponível.

Pendências:
- Inventário integral do repositório e reconciliação do legado.

Próxima fase sequencial:
- FASE A1 — Inventário completo.
```

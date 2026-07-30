# FASE B2 — Higienização do repositório

Status: alterações preparadas; validação automática pendente.

## Escopo

- remover lockfile concorrente;
- remover configuração local versionada;
- oficializar npm e Node;
- corrigir identidade técnica do pacote;
- criar `.gitattributes`;
- endurecer `.gitignore`;
- substituir README genérico;
- documentar ambientes.

## Alterações

- `.env` removido da árvore atual;
- `bun.lockb` removido;
- npm declarado como package manager;
- Node.js e npm declarados em `engines`;
- nome técnico alterado para `aprendendo-com-dj-stay-platform`;
- versão alterada para `0.1.0`;
- scripts `typecheck` e `check` adicionados;
- `package-lock.json` mantido como lockfile único e metadata sincronizada;
- README substituído por documentação operacional;
- `docs/environment.md` criado.

## Limites da fase

- nenhuma regra ESLint ou TypeScript foi relaxada;
- erros de lint não foram corrigidos nesta fase;
- nenhuma dependência foi atualizada ou removida;
- nenhuma referência Supabase operacional foi alterada antes da B4/B6;
- nenhuma escrita foi realizada em produção.

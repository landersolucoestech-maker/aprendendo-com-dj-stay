# FASE B3 — TypeScript, ESLint e build

Status: lote de correções preparado; validação automática pendente.

## Escopo do primeiro lote

- eliminar 10 erros e 8 avisos do baseline;
- substituir `any` por contratos explícitos ou `unknown`;
- corrigir interfaces vazias;
- separar exports não componentes para Fast Refresh;
- corrigir import ESM do plugin Tailwind;
- estabilizar dependências de hook;
- remover logs de cadastro capazes de expor senha.

## Garantias

- nenhuma regra ESLint foi desativada;
- nenhuma opção TypeScript foi relaxada;
- nenhum cast foi adicionado para silenciar erro;
- nenhuma alteração Supabase foi executada;
- produção permanece somente leitura.

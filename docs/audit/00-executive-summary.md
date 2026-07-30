# Resumo executivo — Estágio A

Data operacional: 30 de julho de 2026.

## Estado geral

Classificação: **não apto**.

O repositório é um protótipo React/Vite ligado a um Supabase legado. Os ambientes oficiais `dev` e produção não possuem o domínio da aplicação. Autenticação e restrições foram removidas do HEAD original, páginas privadas estão públicas e múltiplos fluxos exibem sucesso sem persistência.

## Confiança

- alta para a árvore integral do repositório, rotas, páginas, componentes, hooks, migrations, histórico Git e ambientes Supabase atuais;
- bloqueada somente para recursos e dados do projeto Supabase legado, por ausência de permissão.

## Inventário exato

- 149 arquivos em 19 diretórios;
- 97 arquivos TypeScript/TSX;
- 10 declarações de rota;
- 13 páginas React;
- 65 componentes em `src/components`: 16 de domínio e 49 de UI;
- 10 hooks;
- 7 migrations locais;
- 2 lockfiles no snapshot inicial;
- 6 tabelas e 1 função descritas apenas nos tipos legados;
- 0 tabelas `public` de aplicação em Supabase `dev`;
- 0 tabelas `public` de aplicação em produção;
- 0 Edge Functions;
- 0 testes automatizados;
- 1 workflow de baseline criado durante a execução.

## Baseline técnico

GitHub Actions run `30515816270`:

- `npm ci`: sucesso;
- lint: falha, 10 erros e 8 avisos;
- typecheck: sucesso;
- build: sucesso;
- gate final: falha, como esperado.

## Achados críticos

- área do aluno e aulas públicas;
- drift total entre código e ambientes oficiais;
- falso sucesso de pagamento;
- materiais protegidos modelados como públicos.

## Estado por área

| Área | Estado |
| --- | --- |
| GitHub | `main` preservada; execução em `dev` |
| Supabase `dev` | saudável, porém vazio para o domínio |
| produção | somente leitura; schema de aplicação vazio; possui event trigger remoto |
| projeto legado | referenciado, mas inacessível |
| autenticação | removida das rotas ativas |
| autorização | ausente |
| storage | legado, público e ausente nos ambientes oficiais |
| cursos | protótipo de curso único; sem CMS/matrícula real |
| pagamentos/Pix | ausentes; página de sucesso falsa |
| marketplace | ausente |
| afiliados | ausentes |
| testes | ausentes |
| CI | baseline criado; gate falha no lint |
| observabilidade | ausente |

## Produção

Nenhuma escrita foi realizada em produção. Não foram executadas migrations, seeds, alterações de Auth, buckets, policies, secrets, funções, registros ou deploy.

## Direção de remediação

1. higienização e configuração reproduzível;
2. TypeScript/lint/build;
3. ambientes e Auth;
4. schema canônico, RLS e contratos;
5. storage privado;
6. domínio financeiro e provider;
7. funcionalidades;
8. testes, CI e homologação;
9. identidade e design após estabilização.

## Próximo passo

Executar **FASE B2 — Higienização do repositório**, mantendo produção somente leitura.

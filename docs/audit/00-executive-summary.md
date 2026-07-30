# Resumo executivo — Estágio A

Data operacional: 30 de julho de 2026.

## Estado geral

Classificação: **não apto**.

O repositório atual representa um protótipo React/Vite com integração Supabase legada. Os ambientes Supabase oficiais `dev` e produção não possuem o domínio da aplicação. Autenticação e restrições foram removidas do HEAD, páginas privadas estão públicas e múltiplos fluxos exibem sucesso sem persistência.

## Confiança

- alta para rotas, páginas, componentes/hooks de domínio, migrations locais, histórico Git e estado dos Supabase atuais;
- limitada para a árvore física integral do template, porque o checkout privado está bloqueado por DNS e o conector não lista diretórios recursivamente;
- bloqueada para dados/recursos do projeto legado, por ausência de permissão.

## Inventário mínimo comprovado

- 152 commits após o baseline visual inicial;
- 10 declarações de rota ativas;
- 13 páginas React comprovadas;
- 16+ componentes de domínio comprovados;
- 10+ hooks comprovados, incluindo hook responsivo do template;
- 7 migrations locais;
- 2 lockfiles;
- 6 tabelas e 1 função descritas apenas nos tipos legados;
- 0 tabelas `public` de aplicação em Supabase `dev`;
- 0 tabelas `public` de aplicação em produção;
- 0 Edge Functions;
- 0 testes automatizados comprovados;
- 0 workflows/checks no HEAD de `dev`.

## Achados por severidade

### Críticos

- área do aluno e aulas públicas;
- drift total entre código e ambientes oficiais;
- falso sucesso de pagamento;
- materiais protegidos modelados como públicos.

### Altos

- configuração Supabase legada hardcoded;
- função `SECURITY DEFINER` executável publicamente em produção;
- logs capazes de expor senha;
- downloads fabricados;
- falsos sucessos de contato, perfil, e-mail e certificado;
- ausência de transações e entidades financeiras;
- papéis/RLS ausentes;
- script externo sem governança;
- claims e depoimentos não comprovados;
- ausência de testes e CI.

## Estado por área

| Área | Estado |
| --- | --- |
| GitHub | `main` preservada; `dev` criada e contém somente auditoria |
| Supabase `dev` | saudável, porém vazio para o domínio |
| produção | somente leitura; schema de aplicação vazio; possui event trigger remoto |
| projeto legado | referenciado, mas inacessível |
| autenticação | removida das rotas ativas |
| autorização | ausente |
| storage | legado, público e não presente nos ambientes oficiais |
| cursos | protótipo de curso único; sem CMS/matrícula real |
| pagamentos | ausente; página de sucesso falsa |
| Pix | ausente |
| marketplace | ausente |
| afiliados | ausente |
| testes | ausentes |
| CI | ausente |
| observabilidade | ausente |
| documentação operacional | ausente antes da auditoria |

## Produção

Nenhuma escrita foi realizada em produção. Não foram executadas migrations, seeds, alterações de Auth, buckets, policies, secrets, funções, registros ou deploy.

## Decisão arquitetural recomendada

Preservar componentes de UI tecnicamente válidos, mas substituir a fundação operacional:

1. configuração de ambiente tipada;
2. Auth centralizado;
3. schema canônico reproduzível;
4. RLS por ownership e papel;
5. assets privados;
6. backend/RPCs transacionais;
7. domínio financeiro e provider abstrato;
8. testes e CI;
9. somente depois funcionalidades completas e redesign.

## Próximo passo

Iniciar **FASE B1 — Congelamento e baseline reproduzível**, mantendo execução sequencial e produção somente leitura.
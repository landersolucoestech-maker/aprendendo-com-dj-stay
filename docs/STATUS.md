# Estado operacional verificado

Este documento resume somente o que foi comprovado na branch `dev` e no projeto Supabase de desenvolvimento. Implementação em `dev` não equivale a homologação financeira, pentest ou promoção para produção.

## Escopo do produto

A plataforma é exclusiva de um único instrutor proprietário e possui três superfícies:

- portal público e autenticação;
- portal do aluno;
- módulo administrativo do instrutor/proprietário.

O marketplace distribui apenas cursos e produtos digitais do proprietário. Não existe modelo multi-instrutor.

## Implementação validada em `dev`

| Domínio | Estado comprovado |
| --- | --- |
| Autenticação e autorização | sessão Supabase, papéis canônicos e proteção de rotas |
| Cursos e currículo | cursos, módulos, aulas, pré-requisitos, avaliações e fluxo editorial |
| Portal do aluno | matrícula, biblioteca, player, retomada e progresso monotônico |
| Storage e mídia | assets privados, grants, eventos, URLs temporárias e playback protegido |
| Marketplace digital | produtos, licenças, entregáveis, acessos e biblioteca do comprador |
| Pagamentos | checkout, ordens, tentativas, eventos do provider, expiração e entitlements |
| Afiliados e certificados | perfis, links, atribuições, comissões, pagamentos, emissão, revogação e validação pública |
| Contatos e suporte | submissão idempotente, protocolo, tratamento administrativo, tickets e histórico |
| Privacidade e notificações | solicitações de direitos, preferências, favoritos e notificações do aluno |
| Administração | dashboards reais para financeiro, acadêmico, catálogo, suporte, contatos e operação |
| Frontend público | oito rotas anônimas, fallback SPA, acessibilidade, foco, lazy loading e Error Boundary |
| Supply chain | lockfile, audit, SBOM, proveniência, isolamento de rede e artefato reproduzível |
| Banco remoto `dev` | migrations versionadas, RLS, grants, funções privadas e Edge Functions sincronizadas |

A validação consolidada executa instalação limpa, lint, testes unitários, reconstrução local do Supabase, pgTAP, geração de tipos, contratos, TypeScript, build, smoke HTTP e Chrome headless por CDP. Os detalhes sequenciais permanecem em [`refactor`](refactor/README.md).

## Supabase remoto `dev`

Projeto de desenvolvimento: `jmtyurketfclaneqxohu`.

Estão comprovados:

- migrations B140–B144 sincronizadas;
- `pg_cron` 1.6.4;
- zero função do schema `private` executável por `PUBLIC`;
- quatro grants anônimos privados, explícitos e limitados às superfícies públicas;
- rate limit anônimo por origem pseudonimizada com HMAC-SHA256;
- precedência de origem `cf-connecting-ip` → `x-real-ip` → primeiro `x-forwarded-for`;
- contato limitado a cinco submissões em quinze minutos;
- clique de afiliado limitado a cento e vinte eventos em dez minutos;
- limpeza em lote dos contadores expirados;
- advisor de segurança sem lints.

### Crons observados

Os três jobs abaixo foram observados em execução real com status `succeeded`:

- `expire-due-checkout-intents` — a cada cinco minutos;
- `prune-platform-cron-run-history` — retenção do histórico operacional;
- `prune-anonymous-mutation-rate-limits` — limpeza dos contadores anônimos expirados.

A consulta de `cron.job_run_details` mostrou execuções sucessivas de expiração entre 01:50 e 04:05 UTC de 5 de agosto de 2026, além das execuções de retenção e limpeza previstas, sem falha na janela consultada.

## Homologação HTTP remota

A prova remota foi executada por um runner externo contra o gateway real do Supabase `dev`:

- commit: `b665dd9bcd6e1c91a121f584d21cf20e834a5c34`;
- workflow run: `30974559049`;
- artifact: `remote-dev-validation-b665dd9bcd6e1c91a121f584d21cf20e834a5c34`;
- catálogo: 200 requisições, concorrência 10, 200 respostas válidas e zero falha;
- tempo total: 7.148,06 ms;
- média HTTP: 342,30 ms;
- p50: 213,59 ms;
- p95: 977,80 ms;
- p99: 1.033,84 ms;
- contato: cinco submissões aceitas e persistidas;
- sexta submissão: HTTP 400, código PostgreSQL `P0001`, mensagem pública `RATE_LIMITED`.

Também foram executadas 2.000 chamadas diretas ao read model `get_public_course_catalog()` dentro do PostgreSQL, sem persistência, com média de 2,0791 ms por chamada.

As cinco mensagens e o contador HMAC criados pela homologação foram removidos após a coleta da evidência. A verificação final retornou zero mensagem e zero contador residual. A prova detalhada está em [`refactor/REMOTE-DEV-HOMOLOGATION.md`](refactor/REMOTE-DEV-HOMOLOGATION.md).

O advisor de performance permanece apenas com avisos informativos de índices ainda não utilizados. Como o ambiente não possui tráfego operacional nem massa representativa, nenhum índice foi removido com base nesses avisos.

## Estado dos dados

O ambiente `dev` permanece sem massa operacional:

- zero usuário Auth;
- zero curso;
- zero módulo;
- zero aula;
- zero matrícula;
- zero asset;
- zero mídia de aula;
- zero objeto no Storage.

As tabelas de curso, currículo, matrícula, assets e mídia possuem relações reais com `auth.users`. Não foi criado usuário diretamente por SQL e não foi fabricada matrícula para simular uma homologação autenticada.

## Integrações implantadas em `dev`

- `media-playback`;
- `create-asaas-checkout`;
- `asaas-webhook`.

A presença dessas funções não comprova transação financeira no provider.

## Dependências externas restantes

Ainda exigem insumos ou validação externa:

- criação de usuários reais de homologação e massa válida no Supabase `dev` para E2E autenticado de matrícula, mídia e playback;
- credenciais válidas do sandbox Asaas;
- configuração do webhook no painel do Asaas;
- compra, confirmação, reembolso e chargeback no sandbox;
- validação de e-mails transacionais com provedor e caixas de destino reais;
- testes de carga autenticados e com dados representativos antes de qualquer decisão sobre índices;
- pentest independente antes da promoção para produção.

## Produção

A branch `main` e o projeto Supabase de produção não foram alterados.

Qualquer promoção exige:

- gate verde no snapshot candidato;
- revisão do diff `dev → main`;
- Pull Request explícito;
- revalidação das credenciais e integrações no ambiente de destino.

## Fontes de verdade

- ambiente: [`environment.md`](environment.md);
- fases e garantias: [`refactor`](refactor/README.md);
- auditoria: [`audit`](audit/README.md);
- visão geral: [`../README.md`](../README.md).

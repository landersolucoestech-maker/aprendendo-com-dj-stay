# Estado operacional verificado

Este documento separa implementação técnica, dependências externas e promoção de ambiente. Ele descreve somente o que está comprovado na branch `dev` e no projeto Supabase de desenvolvimento.

## Escopo do produto

A plataforma é exclusiva de um único instrutor proprietário. Existem três superfícies de acesso:

- portal público e autenticação;
- portal do aluno;
- módulo administrativo do instrutor/proprietário.

O marketplace distribui somente cursos e produtos digitais do proprietário. Não existe modelo multi-instrutor ou administração externa.

## Validado em `dev`

Os seguintes domínios possuem implementação, persistência, autorização e contratos automatizados no ambiente de desenvolvimento:

| Domínio | Evidência técnica |
| --- | --- |
| Autenticação e papéis | sessão Supabase, resolução canônica de papel e proteção de rotas |
| Storage privado | ativos persistidos, grants, eventos, URLs temporárias e reprodução protegida |
| Cursos e currículo | cursos, módulos, aulas, pré-requisitos, avaliações e fluxo editorial |
| Catálogo público | read model anônimo de cursos publicados, preços, módulos e totais derivados, sem exposição de assets ou campos administrativos |
| Vitrine autenticada de cursos | resolução autenticada por slug, bloqueio de matrícula ativa e checkout hospedado para aluno/proprietário |
| Portal do aluno | matrículas, biblioteca, player, retomada e progresso monotônico |
| Marketplace digital | produtos, licenças, entregáveis, acessos e biblioteca do comprador |
| Pagamentos | checkout, ordens, tentativas, eventos do provider e concessão/revogação de acesso |
| Retorno financeiro exato | consulta autenticada pelo `checkout_intent` retornado pelo provider, com pedido, tentativa e entitlement da compra correspondente, sem fallback por outra matrícula ou acesso |
| Expiração de checkout | reconciliação pelo horário do servidor, sincronização de intent/pedido/tentativa e bloqueio de reabertura de pedidos financeiramente terminais |
| Cron de expiração | job PostgreSQL a cada cinco minutos, executado como `postgres`, com batch limitado, idempotente e sem segredo HTTP |
| Saúde do cron | read model exclusivo do proprietário com estado do job, última execução, último sucesso, falhas em 24 horas e histórico recente sanitizado |
| Retenção do cron | job diário `prune-platform-cron-run-history`, com retenção padrão de 30 dias, lote limitado e preservação de execuções recentes, ativas e externas |
| Afiliados | perfis, links, atribuições, comissões, ajustes e pagamentos |
| Certificados | emissão, revogação, consulta do aluno e validação pública |
| Contatos | submissão idempotente, protocolo e tratamento administrativo |
| Observabilidade | captura sanitizada de erros do frontend e fila administrativa |
| Administração do proprietário | dashboard administrativo do proprietário com indicadores reais de financeiro, acadêmico, catálogo, suporte, contatos e automação de checkout |
| Supply chain | audit de dependências, lockfile validado, SBOM e manifesto de fontes |
| Frontend | lazy loading, Error Boundary, datas canônicas, acessibilidade e grafo de chunks acíclico |

A home pública não apresenta números de alunos, avaliações, streams, rankings, depoimentos, parcerias, preços ou entregáveis sem uma fonte persistida e contratada. O catálogo é calculado a partir do CMS publicado; estados vazios ou indisponíveis não recebem dados substitutos.

O UUID utilizado para iniciar a compra de curso não participa do catálogo anônimo. Ele é resolvido somente após autenticação, com validação de papel, disponibilidade, preço e matrícula ativa. A compra reutiliza a preparação idempotente e a Edge Function do checkout hospedado.

O retorno do checkout usa exclusivamente o parâmetro `checkout_intent` pertencente à conta autenticada. A interface representa estados pendentes, confirmação, liberação de acesso, cancelamento, expiração, falha, reembolso, chargeback, suspensão e revogação sem inferir sucesso por outra matrícula ou produto existente.

Checkouts vencidos são reconciliados por `expires_at` e pelo relógio do PostgreSQL. Somente intents ainda não pagos podem expirar; pedidos pagos, em reembolso ou em chargeback não são reabertos pelo claim do provedor. A chave idempotente local só é removida quando o estado persistido confirma expiração ou cancelamento.

O job `expire-due-checkout-intents` executa `private.expire_due_checkout_intents(100)` a cada cinco minutos. Ele é criado por `postgres`, não depende de navegador ou Edge Function e mantém os metadados e resultados operacionais nas tabelas nativas do Supabase Cron.

O dashboard do proprietário consulta a saúde desse job por uma RPC sanitizada. A interface informa configuração, atividade, agenda, última execução, último sucesso, falhas nas últimas 24 horas e até oito execuções recentes, sem expor comando SQL, usuário do banco, banco de destino, PID ou identificadores internos do `pg_cron`.

O job `prune-platform-cron-run-history` executa diariamente a limpeza limitada do histórico nativo. A configuração padrão mantém 30 dias e remove no máximo 5.000 execuções concluídas por lote, exclusivamente dos jobs reconhecidos da plataforma. Execuções em andamento, registros recentes e jobs externos são preservados.

O gate técnico executa instalação limpa, lint, reconstrução local do Supabase, pgTAP, sincronização de tipos, contratos estáticos, TypeScript, audit de dependências, build e validação de chunks.

## Integrações implantadas em `dev`

As Edge Functions abaixo fazem parte da implementação de desenvolvimento:

- `media-playback`;
- `create-asaas-checkout`;
- `asaas-webhook`.

A presença da função e a aprovação do gate não equivalem a uma transação financeira homologada pelo provider.

O módulo PostgreSQL `pg_cron`, os jobs de expiração e retenção e o read model administrativo de saúde fazem parte das migrations versionadas em `dev`, mas ainda não foram promovidos ao Supabase remoto ou à produção.

## Dependências de homologação externa

Ainda exigem validação fora do repositório:

- credenciais válidas do sandbox Asaas;
- configuração do webhook no painel do provider;
- execução de compra, confirmação, reembolso e chargeback no sandbox;
- observação dos jobs, da saúde administrativa e de `cron.job_run_details` após a aplicação das migrations no ambiente remoto;
- validação dos e-mails transacionais, caso um provider de e-mail seja configurado;
- testes de carga e observação de índices com tráfego representativo;
- pentest independente antes da promoção para produção.

Nenhum desses itens pode ser marcado como concluído apenas porque o código compila ou a Edge Function está implantada.

## Produção

A branch `main` e o projeto Supabase de produção não foram promovidos por esta sequência de trabalho.

Portanto:

- `dev` é o único ambiente com escrita autorizada durante a execução;
- produção permanece sem alterações;
- qualquer promoção exige gate verde, revisão do diff e Pull Request `dev → main`;
- credenciais e configurações externas devem ser revalidadas no ambiente de destino.

## Fonte de verdade

- estado funcional: código, migrations, pgTAP e contratos versionados;
- estado de ambiente: [`environment.md`](environment.md);
- decisões e fases: [`refactor`](refactor/README.md);
- auditoria: [`audit`](audit/README.md);
- visão inicial: [`../README.md`](../README.md).

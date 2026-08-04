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
| Analytics financeiro | filtros de 7 a 365 dias, receita bruta, receita após reversões, ticket médio, clientes únicos, receita por tipo, ranking e série diária |
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
| Supply chain | audit de dependências, lockfile validado, SBOM, manifesto de fontes e redação de credenciais locais do Supabase CLI nos logs de CI |
| Shell público e proveniência | `pt-BR`, metadados operacionais, favicon local e ausência bloqueante de Lovable, GPT Engineer ou scripts externos herdados |
| Entrega HTTP | manifesto de release, assets locais, resposta da home e fallback SPA validados sobre `vite preview` |
| Runtime público | Chrome headless controlado por CDP valida conteúdo final em oito rotas anônimas, captura exceções, rejeita o Error Boundary e exige landmark, `#main-content`, `tabindex="-1"`, skip link e live region antes do snapshot |
| Frontend | lazy loading, Error Boundary, datas canônicas, reconciliação acessível após substituições do `Suspense` e grafo de chunks acíclico |

A matriz pública executada no navegador contém:

- `/`;
- `/login`;
- `/certificado`;
- `/contato`;
- `/matricule-se`;
- `/esqueceu-senha`;
- `/acesso-negado`;
- uma rota inexistente dedicada ao fallback 404.

Cada rota é considerada pronta somente quando o React renderizou o conteúdo final contratado, existe exatamente um `#main-content` representado por `<main>` ou `role="main"`, o alvo possui `tabindex="-1"`, existe exatamente um link `Pular para o conteúdo principal`, a live region de navegação está presente e não ocorreu exceção JavaScript não tratada.

A home pública não apresenta números de alunos, avaliações, streams, rankings, depoimentos, parcerias, preços ou entregáveis sem uma fonte persistida e contratada. O catálogo é calculado a partir do CMS publicado; estados vazios ou indisponíveis não recebem dados substitutos.

O UUID utilizado para iniciar a compra de curso não participa do catálogo anônimo. Ele é resolvido somente após autenticação, com validação de papel, disponibilidade, preço e matrícula ativa. A compra reutiliza a preparação idempotente e a Edge Function do checkout hospedado.

O retorno do checkout usa exclusivamente o parâmetro `checkout_intent` pertencente à conta autenticada. A interface representa estados pendentes, confirmação, liberação de acesso, cancelamento, expiração, falha, reembolso, chargeback, suspensão e revogação sem inferir sucesso por outra matrícula ou produto existente.

O analytics financeiro considera somente pedidos com `payment_confirmed_at` persistido no intervalo escolhido. A receita após reversões desconta reembolsos concluídos e chargebacks perdidos. Tarifas do provider, impostos, custos e comissões não são tratados como receita líquida enquanto não houver um ledger consolidado que sustente esse cálculo.

Checkouts vencidos são reconciliados por `expires_at` e pelo relógio do PostgreSQL. Somente intents ainda não pagos podem expirar; pedidos pagos, em reembolso ou em chargeback não são reabertos pelo claim do provedor. A chave idempotente local só é removida quando o estado persistido confirma expiração ou cancelamento.

O job `expire-due-checkout-intents` executa `private.expire_due_checkout_intents(100)` a cada cinco minutos. Ele é criado por `postgres`, não depende de navegador ou Edge Function e mantém os metadados e resultados operacionais nas tabelas nativas do Supabase Cron.

O dashboard do proprietário consulta a saúde desse job por uma RPC sanitizada. A interface informa configuração, atividade, agenda, última execução, último sucesso, falhas nas últimas 24 horas e até oito execuções recentes, sem expor comando SQL, usuário do banco, banco de destino, PID ou identificadores internos do `pg_cron`.

O job `prune-platform-cron-run-history` executa diariamente a limpeza limitada do histórico nativo. A configuração padrão mantém 30 dias e remove no máximo 5.000 execuções concluídas por lote, exclusivamente dos jobs reconhecidos da plataforma. Execuções em andamento, registros recentes e jobs externos são preservados.

O gate técnico executa instalação limpa, lint, reconstrução local do Supabase, pgTAP, sincronização de tipos, contratos estáticos, TypeScript, audit de dependências, build, validação de chunks, smoke HTTP e smoke bloqueante em Chrome headless com matriz pública e prontidão acessível.

O build de qualidade usado pelo CI para exercitar o runtime público utiliza uma chave sintética canônica e sem validade no Supabase. Esse artefato é explicitamente **não implantável**. Builds locais reais, homologação remota e produção continuam exigindo uma chave publishable ativa fornecida pelo ambiente e nunca versionada.

A evidência integral mais recente desta sequência é o commit `63ebdfd043fc4a3ba02642c7b0f470e97be0611d`, aprovado no mesmo snapshot por instalação, lint, testes unitários, reconstrução local do Supabase, pgTAP, tipos, contratos, TypeScript, build, entrega HTTP e navegador acessível em oito rotas.

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

Nenhum desses itens pode ser marcado como concluído apenas porque o código compila, a Edge Function está implantada ou o navegador público passa no CI.

## Produção

A branch `main` e o projeto Supabase de produção não foram promovidos por esta sequência de trabalho.

Portanto:

- `dev` é o único ambiente com escrita autorizada durante a execução;
- produção permanece sem alterações;
- qualquer promoção exige gate verde, revisão do diff e Pull Request `dev → main`;
- credenciais e configurações externas devem ser revalidadas no ambiente de destino.

## Fonte de verdade

- estado funcional: código, migrations, pgTAP e contratos versionados;
- estado do artefato público: build, smoke HTTP e evidências do Chrome headless;
- estado de ambiente: [`environment.md`](environment.md);
- decisões e fases: [`refactor`](refactor/README.md);
- auditoria: [`audit`](audit/README.md);
- visão inicial: [`../README.md`](../README.md).

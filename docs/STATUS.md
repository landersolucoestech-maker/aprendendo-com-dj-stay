# Estado operacional verificado

Este documento separa implementação técnica, dependências externas e promoção de ambiente. Ele descreve somente o que está comprovado na branch `dev` e no projeto Supabase de desenvolvimento.

## Escopo do produto

A plataforma é exclusiva de um único instrutor proprietário. Existem três superfícies de acesso:

- portal público e autenticação;
- portal do aluno;
- módulo administrativo do instrutor/proprietário.

O marketplace distribui somente cursos e produtos digitais do proprietário. Não existe modelo multi-instrutor ou administração externa.

## Validado em `dev`

| Domínio | Evidência técnica |
| --- | --- |
| Autenticação e papéis | sessão Supabase, resolução canônica de papel e proteção de rotas |
| Storage privado | ativos persistidos, grants, eventos, URLs temporárias e reprodução protegida |
| Cursos e currículo | cursos, módulos, aulas, pré-requisitos, avaliações e fluxo editorial |
| Catálogo público | read model anônimo de cursos publicados, preços e totais derivados, sem exposição de assets administrativos |
| Vitrine autenticada de cursos | resolução por slug, disponibilidade, matrícula ativa e checkout hospedado |
| Portal do aluno | matrículas, biblioteca, player, retomada e progresso monotônico |
| Marketplace digital | produtos, licenças, entregáveis, acessos e biblioteca do comprador |
| Pagamentos | checkout, ordens, tentativas, eventos do provider e concessão ou revogação de acesso |
| Retorno financeiro exato | consulta autenticada pelo `checkout_intent` pertencente à conta autenticada, sem fallback por matrícula ou acesso não relacionado |
| Expiração de checkout | reconciliação pelo relógio do servidor, proteção de pedidos financeiramente terminais e rotação controlada da idempotência |
| Cron de expiração | job PostgreSQL `expire-due-checkout-intents` a cada cinco minutos, executado como `postgres`, limitado e sem requisição HTTP |
| Saúde do cron | read model sanitizado do proprietário com configuração, última execução, último sucesso, falhas em 24 horas e histórico recente |
| Retenção do cron | job diário `prune-platform-cron-run-history`, janela padrão de 30 dias, lote limitado e preservação de execuções recentes, ativas e externas |
| Analytics financeiro | filtros temporais, receita confirmada, reversões, ticket médio, clientes únicos, receita por tipo, ranking e série diária |
| Afiliados e certificados | perfis, links, atribuições, comissões, pagamentos, emissão, revogação e validação pública |
| Contatos e observabilidade | submissão idempotente, protocolo, tratamento administrativo e captura sanitizada de erros |
| Dashboard administrativo do proprietário | seis read models reais para financeiro, acadêmico, catálogo, suporte, contatos e fila operacional, sem estimativas ou dados de exemplo |
| Supply chain | React Router 8.3.0, React 19.2.8, lockfile estrito, auditorias completa e de produção com zero vulnerabilidades, SBOM, manifesto de fontes e redação de credenciais locais do Supabase CLI nos logs de CI |
| Shell público e proveniência | `pt-BR`, metadados operacionais, favicon local e ausência bloqueante de Lovable, GPT Engineer ou scripts externos herdados |
| Entrega HTTP | manifesto de release, assets locais, home e fallback SPA validados sobre `vite preview` |
| Runtime público | Chrome headless controlado por CDP valida conteúdo final em oito rotas anônimas, captura exceções, rejeita o Error Boundary e exige landmark, `#main-content`, `tabindex="-1"`, skip link e live region antes do snapshot |
| Runtime sintético do catálogo | fixture canônica em memória validada pelo mesmo schema Zod da RPC, zero chamada a `get_public_course_catalog`, zero rede Supabase remota e home aprovada somente após conteúdo final |
| Isolamento de rede público | stack tipográfica nativa, exatamente um `Document` por rota e toda requisição HTTP ou HTTPS restrita à origem e porta exatas do documento servido |
| Rede da navegação client-side | exatamente nove artefatos `*.network.json`; a prova home → `/login` mantém um único `Document` inicial, não cria novo `Document` e permanece na mesma origem e porta |
| Limpeza do perfil do Chrome | repetição limitada somente da exclusão do diretório criado pelo smoke para `ENOTEMPTY`, `EBUSY` ou `EPERM`; nenhuma reexecução integral do navegador e nenhum glob em `/tmp` |
| Diagnósticos do gate | stdout e stderr de TypeScript e navegador persistidos em artifact com `set -o pipefail`, sem transformar falhas em sucesso |
| Frontend acessível | lazy loading, Error Boundary, reconciliação acessível após substituições do `Suspense`, foco diferido em fallbacks e handoff para o conteúdo final |
| Supabase remoto `dev` | migrations versionadas sincronizadas, contratos confrontados, `pg_cron` 1.6.4 instalado, três jobs ativos, 132 de 132 execuções concluídas com sucesso na janela de 24 horas observada e advisor de segurança sem lints |
| Funções privadas | zero função do schema `private` executável por `PUBLIC`, quatro grants anônimos explícitos e restritos às superfícies públicas, consumidores autenticados preservados e privilégio padrão fechado para novas funções |
| Mutações anônimas | contato limitado a cinco submissões em quinze minutos e afiliado a cento e vinte cliques em dez minutos por origem HMAC, com precedência `cf-connecting-ip` → `x-real-ip` → fallback `x-forwarded-for`, sem IP bruto, RLS, falha fechada e mensagens públicas sanitizadas |

O hardening B142 foi aplicado no Supabase remoto `dev` pela migration `20260805015339_private_function_execute_hardening`. Cinquenta e quatro funções privadas deixaram de depender de `PUBLIC EXECUTE`; os acessos necessários de `authenticated` e `service_role` foram preservados explicitamente. O teste pgTAP dedicado possui 11 asserções e foi executado sem falhas. A prova completa está em [`refactor/FASE-B142-PRIVATE-FUNCTION-EXECUTE-HARDENING.md`](refactor/FASE-B142-PRIVATE-FUNCTION-EXECUTE-HARDENING.md).

O B143 foi aplicado pelas migrations `20260805022138_anonymous_mutation_rate_limiting`, `20260805022356_anonymous_mutation_rate_limit_rls_policies` e `20260805023924_anonymous_mutation_rate_limit_origin_precedence`. As RPCs anônimas de contato e clique de afiliado permanecem públicas, porém toda inserção nas tabelas-alvo passa por quota transacional baseada na origem entregue pelo gateway. O identificador é pseudonimizado com HMAC-SHA256, nenhum endereço IP bruto é persistido, chamadas HTTP sem origem falham fechado e o contexto `service_role` não consome quota anônima. O hardening prioriza `cf-connecting-ip`, usa `x-real-ip` quando necessário e mantém `x-forwarded-for` apenas como fallback. A prova pgTAP dedicada possui 24 asserções e o advisor de segurança remoto permaneceu sem lints. A evidência integral está em [`refactor/FASE-B143-ANONYMOUS-MUTATION-RATE-LIMITING.md`](refactor/FASE-B143-ANONYMOUS-MUTATION-RATE-LIMITING.md).

O dashboard administrativo do proprietário é protegido pelo papel administrativo e consolida somente dados persistidos. A visão geral usa seis read models reais, não apresenta métricas estimadas e mantém links operacionais para pagamentos, alunos, suporte e contatos.

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

A navegação client-side lazy da home para `/login` também é bloqueante. O fallback com `data-route-focus-deferred="true"` pode ou não ser observado, conforme a disponibilidade do chunk; quando renderizado, ele nunca pode receber foco. Em ambos os caminhos, a transição deve terminar com `document.activeElement.id === "main-content"`, elemento ativo conectado ao DOM e anúncio `Navegação concluída. Conteúdo principal atualizado.`. Se o target final previamente focado for substituído, o foco é restaurado apenas quando a referência anterior estiver desconectada; mutações que preservam o target não causam refoco.

A mesma transição persiste `client-navigation.network.json`. A matriz consolidada exige exatamente nove artefatos de rede: oito carregamentos diretos e uma prova client-side. A prova começa com exatamente um `Document` para `/`, registra um marcador de fase para `/login`, proíbe novo `Document` durante a transição e restringe todos os requests HTTP ou HTTPS à origem e porta efêmera do documento inicial. Qualquer resposta HTTP com status igual ou superior a 400 bloqueia o gate.

A home pública não apresenta números, avaliações, rankings, depoimentos, preços ou entregáveis sem fonte persistida e contratada. O catálogo real é calculado a partir do CMS publicado e estados vazios não recebem dados substitutos.

No build sintético de qualidade, o catálogo é fornecido por uma fixture canônica em memória que satisfaz `PublicCourseCatalog` e passa pelo mesmo schema Zod da RPC real. O carregador retorna antes de executar `get_public_course_catalog`; os testes exigem zero chamadas à RPC e o Chrome exige `Curso de validação do runtime` e `Investimento atual` antes de considerar a home pronta. Estados `Carregando catálogo`, `Carregando conteúdo publicado` e `Catálogo temporariamente indisponível` são rejeitados.

O domínio Network do CDP grava `<rota>.network.json`, bloqueia respostas HTTP com status igual ou superior a 400 e qualquer request para `*.supabase.co`. O verificador B128/B132 exige exatamente um request principal `Document` por rota em cada carregamento direto, um único `Document` inicial na prova client-side e restringe todos os recursos HTTP ou HTTPS à mesma origem e porta efêmera do documento servido. O shell usa stack tipográfica nativa e não depende de Google Fonts ou arquivo de fonte versionado.

A corrida de filesystem na remoção do perfil temporário do Chrome é tratada no ponto de origem. Cada smoke encerra seus processos e repete somente a exclusão do próprio diretório, no máximo seis vezes e apenas para `ENOTEMPTY`, `EBUSY` ou `EPERM`. O workflow não interpreta logs para reexecutar o smoke, não remove `/tmp/djstay-browser-profile-*` por glob e não repete rotas já aprovadas. Falhas funcionais de conteúdo, acessibilidade, JavaScript ou rede continuam bloqueando na primeira execução.

Os comandos de TypeScript e dos três smokes do navegador persistem seus logs no artifact `gate-diagnostics-<commit>`. A captura usa `set -o pipefail`, portanto o exit code original permanece bloqueante.

O Retorno financeiro exato usa exclusivamente o `checkout_intent` pertencente à conta autenticada. A interface representa pendência, confirmação, liberação, cancelamento, expiração, falha, reembolso, chargeback, suspensão e revogação sem inferir sucesso por outro acesso existente.

A Expiração de checkout é reconciliada por `expires_at` e pelo relógio do PostgreSQL. Pedidos pagos, em reembolso ou em chargeback não são reabertos; uma nova chave idempotente só é permitida após estado persistido compatível.

O Cron de expiração `expire-due-checkout-intents` executa `private.expire_due_checkout_intents(100)` a cada cinco minutos como `postgres`. A Saúde do cron é exposta ao proprietário sem comando SQL, usuário do banco, PID ou identificadores internos do `pg_cron`.

A Retenção do cron é executada pelo job `prune-platform-cron-run-history`. A política padrão mantém 30 dias e remove no máximo 5.000 execuções concluídas por lote somente dos jobs reconhecidos da plataforma; execuções em andamento, registros recentes e jobs externos são preservados.

O gate técnico executa instalação limpa, lint, reconstrução local do Supabase, pgTAP, sincronização de tipos, contratos estáticos, TypeScript, audit de dependências, build, validação de chunks, smoke HTTP e smoke bloqueante em Chrome headless com matriz pública e prontidão acessível. O mesmo estágio executa uma única vez a prova de transferência de foco por navegação client-side e, depois que os nove artefatos existem, o isolamento exato de rede.

O build de qualidade usado pelo CI utiliza uma chave sintética canônica e sem validade no Supabase. Esse artefato é explicitamente **não implantável**. Builds locais reais, homologação remota e produção continuam exigindo uma chave publishable ativa fornecida pelo ambiente e nunca versionada.

A evidência B123 permanece registrada no commit `63ebdfd043fc4a3ba02642c7b0f470e97be0611d`. A evidência B125 registrou 795 testes unitários no commit `03106954c5ed0d9238a55625f4c30cf7e83a4699`. A evidência B127–B130 registrou 799 testes unitários no commit `92270adc7d949f0719e1fdb3673f2d47bedb6aaf`. A evidência integral B139 permanece preservada no snapshot funcional `c4e299b8f544dc07bd394f1ae287efb4ee53e2e9`, issue `#1074` e run `30957555483`, aprovado no mesmo snapshot por instalação, lint, 799 testes unitários, reconstrução local do Supabase, 1.878 testes pgTAP, tipos, contratos, TypeScript, build, oito rotas públicas acessíveis, handoff de foco lazy, exatamente nove artefatos de rede, ausência de novo `Document` na navegação home → `/login`, isolamento exato de origem e porta e uma única execução do smoke principal sem contorno no workflow. A sincronização remota posterior está registrada em [`refactor/FASE-B140-SUPABASE-DEV-REMOTE-SYNC.md`](refactor/FASE-B140-SUPABASE-DEV-REMOTE-SYNC.md).

A evidência técnica mais recente usa o snapshot `e721da645855b92c5a1a5b09202f4a96bf89127a`, issue `#1128` e run `30978834435`. O mesmo snapshot aprovou instalação limpa, lint, 804 testes unitários, reconstrução local do Supabase, 1.935 testes pgTAP, sincronização de tipos, todos os contratos estáticos, TypeScript, auditorias completa e de produção com zero vulnerabilidades, build, oito rotas públicas, navegação client-side rápida ou suspensa, navegação móvel, skip link por teclado confiável, exatamente nove artefatos de rede e isolamento de origem, porta e `Document`.

## Integrações implantadas em `dev`

As Edge Functions abaixo fazem parte da implementação de desenvolvimento:

- `media-playback`;
- `create-asaas-checkout`;
- `asaas-webhook`.

A presença da função e a aprovação do gate não equivalem a uma transação financeira homologada pelo provider.

O módulo PostgreSQL `pg_cron`, os jobs de expiração e retenção e o read model administrativo de saúde foram promovidos ao Supabase remoto `dev`. A versão instalada do `pg_cron` é `1.6.4`; os três jobs estão ativos. Na janela de 24 horas observada em 5 de agosto de 2026, `expire-due-checkout-intents` concluiu 123 de 123 execuções, `prune-anonymous-mutation-rate-limits` concluiu 8 de 8 e `prune-platform-cron-run-history` concluiu 1 de 1, totalizando 132 sucessos e zero falhas. O advisor de segurança permaneceu sem lints. Os avisos de performance são apenas informativos sobre índices ainda não usados em um ambiente sem tráfego representativo; nenhum índice foi removido com base nesse sinal. Nenhum desses componentes foi promovido à produção.

## Dependências de homologação externa

Ainda exigem validação fora do repositório:

- criação de massa operacional válida no Supabase `dev` para E2E autenticado de matrícula, mídia e playback, porque o ambiente permanece sem usuários, cursos, aulas, assets ou matrículas;
- credenciais válidas do sandbox Asaas;
- configuração do webhook no painel do provider;
- execução de compra, confirmação, reembolso e chargeback no sandbox;
- observação continuada dos jobs e de `cron.job_run_details` antes da promoção, apesar da janela atual de 24 horas já registrar 132 de 132 execuções bem-sucedidas;
- validação de e-mails transacionais;
- testes de carga e observação de índices com tráfego representativo;
- pentest independente antes da promoção para produção.

Nenhum desses itens pode ser marcado como concluído apenas porque o código compila, a Edge Function está implantada, o cron executou uma vez, uma quota por origem está ativa ou o navegador público passa no CI.

## Produção

A branch `main` e o projeto Supabase de produção não foram promovidos por esta sequência de trabalho.

Portanto:

- `dev` é o único ambiente com escrita autorizada durante a execução;
- produção permanece sem alterações;
- qualquer promoção exige gate verde, revisão do diff e Pull Request `dev → main`;
- credenciais e configurações externas devem ser revalidadas no ambiente de destino.

## Fonte de verdade

- estado funcional: código, migrations, pgTAP e contratos versionados;
- estado do artefato público: build, smoke HTTP, evidências do Chrome headless e artifacts de rede/diagnóstico;
- estado de ambiente: [`environment.md`](environment.md);
- decisões e fases: [`refactor`](refactor/README.md);
- auditoria: [`audit`](audit/README.md);
- visão inicial: [`../README.md`](../README.md).
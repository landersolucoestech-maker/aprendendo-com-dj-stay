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
| Supply chain | audit de dependências, lockfile validado, SBOM, manifesto de fontes e redação de credenciais locais do Supabase CLI nos logs de CI |
| Shell público e proveniência | `pt-BR`, metadados operacionais, favicon local e ausência bloqueante de Lovable, GPT Engineer ou scripts externos herdados |
| Entrega HTTP | manifesto de release, assets locais, home e fallback SPA validados sobre `vite preview` |
| Runtime público | Chrome headless controlado por CDP valida conteúdo final em oito rotas anônimas, captura exceções, rejeita o Error Boundary e exige landmark, `#main-content`, `tabindex="-1"`, skip link e live region antes do snapshot |
| Runtime sintético do catálogo | fixture canônica em memória validada pelo mesmo schema Zod da RPC, zero chamada a `get_public_course_catalog`, zero rede Supabase remota e home aprovada somente após conteúdo final |
| Isolamento de rede público | stack tipográfica nativa, exatamente um `Document` por rota e toda requisição HTTP ou HTTPS restrita à origem e porta exatas do documento servido |
| Diagnósticos do gate | stdout e stderr de TypeScript e navegador persistidos em artifact com `set -o pipefail`, sem transformar falhas em sucesso |
| Frontend acessível | lazy loading, Error Boundary, reconciliação acessível após substituições do `Suspense`, foco diferido em fallbacks e handoff para o conteúdo final |

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

A navegação client-side lazy da home para `/login` também é bloqueante. O Chrome precisa observar o fallback com `data-route-focus-deferred="true"`, comprovar que ele nunca recebeu foco e terminar com `document.activeElement.id === "main-content"`, elemento ativo conectado ao DOM e anúncio `Navegação concluída. Conteúdo principal atualizado.`. Se o target final previamente focado for substituído, o foco é restaurado apenas quando a referência anterior estiver desconectada; mutações que preservam o target não causam refoco.

A home pública não apresenta números, avaliações, rankings, depoimentos, preços ou entregáveis sem fonte persistida e contratada. O catálogo real é calculado a partir do CMS publicado e estados vazios não recebem dados substitutos.

No build sintético de qualidade, o catálogo é fornecido por uma fixture canônica em memória que satisfaz `PublicCourseCatalog` e passa pelo mesmo schema Zod da RPC real. O carregador retorna antes de executar `get_public_course_catalog`; os testes exigem zero chamadas à RPC e o Chrome exige `Curso de validação do runtime` e `Investimento atual` antes de considerar a home pronta. Estados `Carregando catálogo`, `Carregando conteúdo publicado` e `Catálogo temporariamente indisponível` são rejeitados.

O domínio Network do CDP grava `<rota>.network.json`, bloqueia respostas HTTP com status igual ou superior a 400 e qualquer request para `*.supabase.co`. O verificador B128 exige exatamente um request principal `Document` por rota e restringe todos os recursos HTTP ou HTTPS à mesma origem e porta efêmera do documento servido. O shell usa stack tipográfica nativa e não depende de Google Fonts ou arquivo de fonte versionado.

Os comandos de TypeScript e dos três smokes do navegador persistem seus logs no artifact `gate-diagnostics-<commit>`. A captura usa `set -o pipefail`, portanto o exit code original permanece bloqueante.

O Retorno financeiro exato usa exclusivamente o `checkout_intent` pertencente à conta autenticada. A interface representa pendência, confirmação, liberação, cancelamento, expiração, falha, reembolso, chargeback, suspensão e revogação sem inferir sucesso por outro acesso existente.

A Expiração de checkout é reconciliada por `expires_at` e pelo relógio do PostgreSQL. Pedidos pagos, em reembolso ou em chargeback não são reabertos; uma nova chave idempotente só é permitida após estado persistido compatível.

O Cron de expiração `expire-due-checkout-intents` executa `private.expire_due_checkout_intents(100)` a cada cinco minutos como `postgres`. A Saúde do cron é exposta ao proprietário sem comando SQL, usuário do banco, PID ou identificadores internos do `pg_cron`.

A Retenção do cron é executada pelo job `prune-platform-cron-run-history`. A política padrão mantém 30 dias e remove no máximo 5.000 execuções concluídas por lote somente dos jobs reconhecidos da plataforma; execuções em andamento, registros recentes e jobs externos são preservados.

O gate técnico executa instalação limpa, lint, reconstrução local do Supabase, pgTAP, sincronização de tipos, contratos estáticos, TypeScript, audit de dependências, build, validação de chunks, smoke HTTP e smoke bloqueante em Chrome headless com matriz pública e prontidão acessível. O mesmo estágio executa a prova de transferência de foco por navegação client-side e o isolamento exato de rede.

O build de qualidade usado pelo CI utiliza uma chave sintética canônica e sem validade no Supabase. Esse artefato é explicitamente **não implantável**. Builds locais reais, homologação remota e produção continuam exigindo uma chave publishable ativa fornecida pelo ambiente e nunca versionada.

A evidência B123 permanece registrada no commit `63ebdfd043fc4a3ba02642c7b0f470e97be0611d`. A evidência B125 registrou 795 testes unitários no commit `03106954c5ed0d9238a55625f4c30cf7e83a4699`. A evidência integral mais recente é o commit `92270adc7d949f0719e1fdb3673f2d47bedb6aaf`, aprovado no mesmo snapshot por instalação, lint, 799 testes unitários, reconstrução local do Supabase, 1.878 testes pgTAP, tipos, contratos, TypeScript, build, entrega HTTP, oito rotas públicas acessíveis, handoff de foco lazy, catálogo sintético final e isolamento exato de rede.

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
- observação dos jobs e de `cron.job_run_details` após aplicar migrations no ambiente remoto;
- validação de e-mails transacionais;
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
- estado do artefato público: build, smoke HTTP, evidências do Chrome headless e artifacts de rede/diagnóstico;
- estado de ambiente: [`environment.md`](environment.md);
- decisões e fases: [`refactor`](refactor/README.md);
- auditoria: [`audit`](audit/README.md);
- visão inicial: [`../README.md`](../README.md).

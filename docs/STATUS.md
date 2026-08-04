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
| Analytics financeiro | filtros temporais, receita confirmada, reversões, ticket médio, clientes, ranking e série diária |
| Automação financeira | expiração idempotente de checkout, cron PostgreSQL, saúde administrativa e retenção limitada do histórico |
| Afiliados e certificados | perfis, links, atribuições, comissões, pagamentos, emissão, revogação e validação pública |
| Contatos e observabilidade | submissão idempotente, protocolo, tratamento administrativo e captura sanitizada de erros |
| Administração do proprietário | indicadores reais de financeiro, acadêmico, catálogo, suporte, contatos e automação |
| Supply chain | audit de dependências, lockfile validado, SBOM, manifesto de fontes e redação de credenciais locais do Supabase CLI nos logs de CI |
| Shell público e proveniência | `pt-BR`, metadados operacionais, favicon local e ausência bloqueante de Lovable, GPT Engineer ou scripts externos herdados |
| Entrega HTTP | manifesto de release, assets locais, home e fallback SPA validados sobre `vite preview` |
| Runtime público | Chrome headless controlado por CDP valida conteúdo final em oito rotas anônimas, captura exceções, rejeita o Error Boundary e exige landmark, `#main-content`, `tabindex="-1"`, skip link e live region antes do snapshot |
| Frontend acessível | lazy loading, Error Boundary, reconciliação acessível após substituições do `Suspense`, foco diferido em fallbacks e handoff para o conteúdo final |

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

A home pública não apresenta números, avaliações, rankings, depoimentos, preços ou entregáveis sem fonte persistida e contratada. O catálogo é calculado a partir do CMS publicado e estados vazios não recebem dados substitutos.

O retorno financeiro usa exclusivamente o `checkout_intent` pertencente à conta autenticada. A interface representa pendência, confirmação, liberação, cancelamento, expiração, falha, reembolso, chargeback, suspensão e revogação sem inferir sucesso por outro acesso existente.

Checkouts vencidos são reconciliados pelo relógio do PostgreSQL. Os jobs de expiração e retenção são limitados, idempotentes, executados como `postgres` e observáveis por read model sanitizado do proprietário.

O gate técnico executa instalação limpa, lint, reconstrução local do Supabase, pgTAP, sincronização de tipos, contratos estáticos, TypeScript, audit de dependências, build, validação de chunks, smoke HTTP e smoke bloqueante em Chrome headless com matriz pública e prontidão acessível. O mesmo estágio executa a prova de transferência de foco por navegação client-side.

O build de qualidade usado pelo CI utiliza uma chave sintética canônica e sem validade no Supabase. Esse artefato é explicitamente **não implantável**. Builds locais reais, homologação remota e produção continuam exigindo uma chave publishable ativa fornecida pelo ambiente e nunca versionada.

A evidência B123 permanece registrada no commit `63ebdfd043fc4a3ba02642c7b0f470e97be0611d`. A evidência integral mais recente é o commit `03106954c5ed0d9238a55625f4c30cf7e83a4699`, aprovado no mesmo snapshot por instalação, lint, 795 testes unitários, reconstrução local do Supabase, 1.878 testes pgTAP, tipos, contratos, TypeScript, build, entrega HTTP, oito rotas públicas acessíveis e handoff de foco lazy.

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
- estado do artefato público: build, smoke HTTP e evidências do Chrome headless;
- estado de ambiente: [`environment.md`](environment.md);
- decisões e fases: [`refactor`](refactor/README.md);
- auditoria: [`audit`](audit/README.md);
- visão inicial: [`../README.md`](../README.md).

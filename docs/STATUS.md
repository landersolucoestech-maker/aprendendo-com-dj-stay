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
| Afiliados | perfis, links, atribuições, comissões, ajustes e pagamentos |
| Certificados | emissão, revogação, consulta do aluno e validação pública |
| Contatos | submissão idempotente, protocolo e tratamento administrativo |
| Observabilidade | captura sanitizada de erros do frontend e fila administrativa |
| Administração do proprietário | dashboard administrativo do proprietário com indicadores reais de financeiro, acadêmico, catálogo, suporte e contatos |
| Supply chain | audit de dependências, lockfile validado, SBOM e manifesto de fontes |
| Frontend | lazy loading, Error Boundary, datas canônicas, acessibilidade e grafo de chunks acíclico |

A home pública não apresenta números de alunos, avaliações, streams, rankings, depoimentos, parcerias, preços ou entregáveis sem uma fonte persistida e contratada. O catálogo é calculado a partir do CMS publicado; estados vazios ou indisponíveis não recebem dados substitutos.

O UUID utilizado para iniciar a compra de curso não participa do catálogo anônimo. Ele é resolvido somente após autenticação, com validação de papel, disponibilidade, preço e matrícula ativa. A compra reutiliza a preparação idempotente e a Edge Function do checkout hospedado.

O gate técnico executa instalação limpa, lint, reconstrução local do Supabase, pgTAP, sincronização de tipos, contratos estáticos, TypeScript, audit de dependências, build e validação de chunks.

## Integrações implantadas em `dev`

As Edge Functions abaixo fazem parte da implementação de desenvolvimento:

- `media-playback`;
- `create-asaas-checkout`;
- `asaas-webhook`.

A presença da função e a aprovação do gate não equivalem a uma transação financeira homologada pelo provider.

## Dependências de homologação externa

Ainda exigem validação fora do repositório:

- credenciais válidas do sandbox Asaas;
- configuração do webhook no painel do provider;
- execução de compra, confirmação, reembolso e chargeback no sandbox;
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

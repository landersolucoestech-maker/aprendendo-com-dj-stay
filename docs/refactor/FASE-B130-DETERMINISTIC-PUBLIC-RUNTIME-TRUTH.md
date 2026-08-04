# FASE B130 — Verdade consolidada do runtime público determinístico

## Estado comprovado

O commit `92270adc7d949f0719e1fdb3673f2d47bedb6aaf` foi aprovado no mesmo snapshot por:

- instalação limpa;
- lint;
- 799 testes unitários;
- reconstrução local do Supabase;
- 1.878 testes pgTAP;
- sincronização de tipos;
- contratos estáticos;
- TypeScript;
- build;
- smoke HTTP;
- oito rotas públicas no Chrome;
- navegação client-side lazy com handoff de foco;
- isolamento de rede pela origem e porta exatas do documento servido.

A issue técnica #1046 foi encerrada como `completed`. As evidências abertas dos snapshots anteriores foram encerradas automaticamente como superadas.

## Catálogo sintético B127

O artefato de qualidade não usa uma chave Supabase ativa. No modo sintético:

- `ciRuntimeSmokeEnabled` é derivado do marcador já validado;
- uma fixture canônica em memória satisfaz `PublicCourseCatalog`;
- o mesmo schema Zod da RPC real valida a fixture;
- o carregador retorna antes de executar `get_public_course_catalog`;
- o teste exige zero chamadas à RPC;
- a home só é considerada pronta após renderizar `Curso de validação do runtime` e `Investimento atual`;
- estados de carregamento ou indisponibilidade são rejeitados.

O Chrome registra requisições e respostas por rota, bloqueia chamadas a `*.supabase.co` e bloqueia respostas HTTP com status igual ou superior a 400.

## Isolamento de rede B128

A importação remota do Google Fonts foi removida. O shell utiliza stack tipográfica nativa do sistema, sem arquivo de fonte versionado.

Para cada uma das oito rotas, o verificador exige:

- exatamente um request principal do tipo `Document`;
- documento servido por loopback;
- todas as requisições HTTP ou HTTPS na mesma origem e porta do documento;
- zero requests fora dessa origem.

O artifact `external-network-summary.json` documenta a origem permitida de cada rota e qualquer divergência.

## Diagnósticos B129

TypeScript e os três smokes do navegador persistem stdout e stderr em `gate-diagnostics-<commit>`. `set -o pipefail` preserva o exit code original, portanto os diagnósticos não enfraquecem o gate.

## Limites

Essa evidência comprova o artefato sintético público da branch `dev`. Ela não equivale a:

- implantação real;
- homologação remota do Supabase;
- E2E autenticado;
- homologação financeira no Asaas;
- pentest;
- promoção para produção.

## Exclusões

- Nenhuma migration foi criada ou alterada nesta sequência.
- O Supabase remoto não foi modificado.
- A branch `main` não foi alterada.
- Nenhuma chave ativa ou fonte foi versionada.
- Nenhuma dependência ou lockfile foi alterado.

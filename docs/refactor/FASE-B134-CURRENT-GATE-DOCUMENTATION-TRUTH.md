# FASE B134 — verdade documental do gate atual

## Problema comprovado

O gate B132/B133 já havia aprovado a matriz de nove artefatos de rede e a limpeza determinística do perfil do Chrome, mas `docs/STATUS.md` e o contrato documental ainda apontavam o commit B127–B130 como a evidência integral mais recente. Isso deixava a documentação operacional atrás do código validado.

## Correção aplicada

`docs/STATUS.md` agora registra explicitamente:

- a rede da navegação client-side home → `/login`;
- exatamente nove artefatos `*.network.json`;
- um único `Document` inicial e nenhum novo `Document` na troca client-side;
- mesma origem e porta efêmera em toda a prova;
- bloqueio de respostas HTTP com status igual ou superior a 400;
- limpeza local e limitada do perfil temporário do Chrome;
- ausência de repetição integral do smoke, análise de log ou glob em `/tmp` no workflow;
- commit verde `7f0b21f4f39dd80508f589619e89b987d903a5bc`;
- issue de evidência `#1055`;
- run `30952181505`;
- 799 testes unitários e 1.878 testes pgTAP no mesmo snapshot.

`scripts/check-documentation-truth.mjs` passa a exigir as fases B132, B133 e B134, a evidência atual e os limites de ambiente. Alegações antigas continuam preservadas apenas como histórico identificado, não como estado mais recente.

## Garantias

- a documentação não pode voltar a omitir a prova client-side de rede;
- a documentação não pode declarar o workaround de repetição como comportamento atual;
- o commit integral mais recente precisa estar explícito no status;
- aprovação técnica não pode ser descrita como homologação financeira, pentest ou promoção para produção;
- a branch `main` e o Supabase de produção permanecem sem promoção.

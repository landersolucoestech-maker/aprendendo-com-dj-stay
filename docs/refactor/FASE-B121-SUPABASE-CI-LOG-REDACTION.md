# FASE B121 — Redação de credenciais locais nos logs do Supabase CI

## Problema comprovado

O gate técnico reconstrói o Supabase localmente para aplicar migrations e executar pgTAP. Ao concluir `supabase start`, a CLI imprime um painel operacional com URLs e valores locais no formato de credencial.

Esses valores pertencem ao stack efêmero do runner e não concedem acesso ao projeto remoto. Ainda assim, publicá-los integralmente no GitHub Actions:

- cria ruído e ambiguidade durante auditorias;
- normaliza a exposição de campos chamados `Secret`, `Access Key` e `Secret Key`;
- dificulta distinguir credenciais locais descartáveis de segredos reais;
- aumenta o risco de futuras alterações da CLI exibirem dados mais sensíveis sem revisão do workflow.

## Implementação

O comando `supabase start` continua sendo executado normalmente, mas seu stdout e stderr passam por `scripts/redact-supabase-cli-output.mjs` antes de serem enviados ao log do Actions.

O redator trabalha linha a linha e mascara somente valores com formato de credencial:

- chaves publishable ou secret do Supabase;
- JWTs;
- senhas embutidas em URLs PostgreSQL;
- valores associados aos rótulos `Publishable`, `Secret`, `Access Key` e `Secret Key`.

Mensagens de progresso, nomes de serviços, avisos do Docker, erros de pull, migrations e resultados do pgTAP permanecem visíveis.

O workflow ativa `set -o pipefail`. Assim, uma falha do `supabase start` mantém o status de erro mesmo que o processo de redação termine corretamente. O redator também propaga falhas de leitura ou escrita.

## Contrato permanente

`scripts/check-supabase-ci-log-redaction.mjs` comprova que:

- o redator remove todos os formatos contratados;
- conteúdo operacional não sensível permanece intacto;
- o workflow usa `pipefail` e a pipeline de redação;
- `supabase start` não recebe `|| true`;
- a redação está encadeada ao gate de determinismo do CI.

## Limites

A redação não substitui:

- uso correto de GitHub Secrets para credenciais reais;
- revisão de permissões do workflow;
- rotação de uma credencial efetivamente comprometida;
- proibição de chaves privilegiadas no frontend;
- scanners de segredos do repositório.

## Exclusões

- Nenhuma migration foi criada ou alterada.
- O Supabase remoto não foi modificado.
- A branch `main` não foi alterada.
- Nenhuma credencial real foi versionada.
- Nenhuma dependência ou lockfile foi alterado.

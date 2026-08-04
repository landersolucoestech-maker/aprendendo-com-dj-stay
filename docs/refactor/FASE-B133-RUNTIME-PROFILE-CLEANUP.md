# FASE B133 — limpeza determinística do perfil do Chrome

## Causa comprovada

O smoke público concluía as oito rotas corretamente, encerrava o Chrome e, em seguida, executava uma única chamada síncrona de remoção do perfil temporário. O Chrome ainda podia liberar arquivos internos alguns milissegundos depois do encerramento do processo, produzindo `ENOTEMPTY` em `/tmp/djstay-browser-profile-*`.

A mitigação anterior ficava no workflow: ao reconhecer essa assinatura, o CI executava novamente o smoke inteiro. Isso evitava falso negativo, mas repetia navegação, coleta de artefatos e validações já concluídas em vez de tratar a corrida no ponto em que ela acontecia.

## Correção aplicada

`scripts/run-browser-runtime-smoke.mjs` agora:

- encerra o Chrome e o preview antes de iniciar a limpeza;
- tenta remover somente o diretório temporário criado pela própria execução;
- repete a remoção no máximo seis vezes;
- aceita repetição somente para `ENOTEMPTY`, `EBUSY` e `EPERM`;
- usa espera incremental limitada entre tentativas;
- converte uma falha final de limpeza em falha explícita do próprio smoke;
- não repete rotas, não recria o navegador e não ignora falhas funcionais.

## Remoção do contorno no CI

`.github/workflows/baseline.yml` não possui mais a função `run_runtime_smoke`, busca por assinatura em log, remoção ampla de `/tmp/djstay-browser-profile-*` ou segunda execução do smoke.

A etapa do navegador executa exatamente uma vez, nesta ordem:

1. `run-browser-runtime-smoke.mjs`;
2. `run-browser-client-navigation-smoke.mjs`;
3. `check-browser-network-isolation.mjs`.

`set -o pipefail` preserva o código de saída de cada comando mesmo com a captura dos logs por `tee`.

## Garantias

- uma corrida transitória de liberação de arquivos é tratada localmente;
- uma falha persistente de limpeza bloqueia o gate;
- uma falha de conteúdo, acessibilidade, rede ou JavaScript nunca dispara repetição;
- nenhum diretório temporário de outra execução é removido por glob;
- Supabase remoto não foi modificado;
- nenhuma migration, dependência ou lockfile foi alterado.

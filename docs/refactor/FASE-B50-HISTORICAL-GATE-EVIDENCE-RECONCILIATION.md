# Fase B50 — Reconciliação histórica das evidências do gate

## Objetivo

Sanear o passivo de issues automáticas do workflow `Gate técnico` sem apagar o histórico e sem encerrar execuções que registraram falha, cancelamento ou etapas ignoradas.

## Contexto

Antes da fase B49, toda execução do gate criava uma issue e a deixava aberta, inclusive quando o snapshot terminava integralmente verde. O formato da evidência mudou ao longo do projeto: existem tabelas Markdown antigas, registros com conclusão consolidada e o formato atual com seis resultados explícitos.

Por isso, a reconciliação não depende de uma única estrutura textual rígida.

## Critério conservador

Uma issue histórica pode ser encerrada somente quando todas as condições abaixo forem atendidas:

- permanece aberta;
- não é Pull Request;
- o título começa exatamente com `Gate técnico —`;
- o corpo contém pelo menos uma ocorrência explícita de `success`;
- o corpo não contém `failure`, `cancelled` ou `skipped`.

Esse critério preserva abertas todas as evidências não verdes, independentemente da versão histórica do workflow.

## Execução temporária

A operação utilizou um workflow temporário versionado exclusivamente para:

1. carregar todas as issues abertas antes de iniciar mutações;
2. classificar as evidências pelo critério conservador;
3. encerrar sequencialmente somente as evidências verdes como `completed`;
4. carregar novamente todas as issues abertas;
5. falhar se alguma evidência verde ainda permanecesse aberta;
6. registrar no resumo do job e na issue B50 as quantidades reconciliadas e preservadas.

A coleta integral ocorreu antes dos encerramentos para evitar saltos de paginação causados pela redução da lista de issues abertas durante a própria execução.

## Resultado

Primeira execução, run `30730389174`:

- 386 evidências de gate abertas no início;
- 72 evidências verdes encerradas;
- 314 evidências não verdes preservadas;
- duas leituras imediatamente posteriores ainda observaram evidências verdes por consistência eventual da API.

Verificação idempotente, run `30730434159`:

- zero evidências verdes abertas;
- zero novos encerramentos necessários;
- 315 evidências não verdes preservadas, incluindo a evidência cancelada criada durante os commits sequenciais da própria fase.

O intervalo das evidências verdes reconciliadas foi de `#7` a `#408`. A quantidade final preservada pode crescer quando novos commits intermediários forem cancelados pelo mecanismo de concorrência; isso não altera o critério da B50.

## Segurança operacional

- API GitHub explicitamente versionada em `2026-03-10`;
- media type oficial `application/vnd.github+json`;
- paginação de 100 itens por chamada;
- mutações sequenciais para reduzir pressão sobre rate limits;
- nenhuma exclusão de issue;
- nenhuma alteração de título, corpo ou comentários históricos;
- nenhuma alteração na aplicação, banco, Supabase ou branch `main`.

## Limpeza após execução

O workflow temporário `.github/workflows/b50-reconcile-gate-evidence.yml` foi removido da branch `dev` após a reconciliação e verificação.

O contrato permanente `scripts/check-gate-evidence-lifecycle.mjs` valida que:

- o workflow temporário não reapareceu;
- este documento permanece versionado;
- o comportamento permanente da B49 continua encerrando automaticamente apenas evidências integralmente verdes.

## Critérios de aceite

- nenhuma evidência histórica verde permanece aberta;
- evidências com `failure`, `cancelled` ou `skipped` permanecem abertas;
- quantidade reconciliada registrada;
- quantidade não verde preservada registrada;
- mecanismo temporário removido;
- ausência do mecanismo temporário protegida por contrato permanente;
- gate técnico da branch `dev` preservado.

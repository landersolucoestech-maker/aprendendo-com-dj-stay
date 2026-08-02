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

A operação utiliza um workflow temporário versionado exclusivamente para:

1. carregar todas as issues abertas antes de iniciar mutações;
2. classificar as evidências pelo critério conservador;
3. encerrar sequencialmente somente as evidências verdes como `completed`;
4. carregar novamente todas as issues abertas;
5. falhar se alguma evidência verde ainda permanecer aberta;
6. registrar no resumo do job e na issue B50 as quantidades reconciliadas e preservadas.

A coleta integral ocorre antes dos encerramentos para evitar saltos de paginação causados pela redução da lista de issues abertas durante a própria execução.

## Segurança operacional

- API GitHub explicitamente versionada em `2026-03-10`;
- media type oficial `application/vnd.github+json`;
- paginação de 100 itens por chamada;
- mutações sequenciais para reduzir pressão sobre rate limits;
- nenhuma exclusão de issue;
- nenhuma alteração de título, corpo ou comentários históricos;
- nenhuma alteração na aplicação, banco, Supabase ou branch `main`.

## Limpeza após execução

O workflow temporário deve ser removido da branch `dev` após a reconciliação e verificação. A documentação e a issue B50 permanecem como evidência permanente da operação.

## Critérios de aceite

- nenhuma evidência histórica verde permanece aberta;
- evidências com `failure`, `cancelled` ou `skipped` permanecem abertas;
- quantidade reconciliada registrada;
- quantidade não verde preservada registrada;
- mecanismo temporário removido;
- gate técnico da branch `dev` preservado.

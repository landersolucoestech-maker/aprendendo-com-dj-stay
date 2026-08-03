# Fase B109 — Paginação da biblioteca do aluno

## Objetivo

Permitir que o aluno consulte todos os materiais privados disponíveis, sem carregar a tabela inteira de assets no navegador.

## Implementação

- Nenhuma migration foi necessária.
- A nova consulta usa `count: "exact"` e `.range()` para paginação no PostgreSQL.
- A página usa 20 registros por vez.
- Somente assets `published` e sem `deleted_at` são solicitados.
- A ordenação é determinística por `published_at DESC` e `id DESC`.
- A consulta não filtra `owner_user_id`: a RLS continua sendo a fonte de verdade e preserva materiais concedidos por grants.
- O usuário autenticado é validado antes da consulta.
- A lista anterior permanece visível durante a atualização da página.
- Downloads continuam usando URL temporária validada por `downloadPrivateAsset`.
- A rota `/aluno/biblioteca` é interceptada pelo `StudentPortalRouter` e renderiza a nova página paginada.

## Contrato de dados

O contrato reutiliza `assetRowsSchema` e exige:

- total inteiro e não negativo;
- página nunca maior que o total persistido;
- lifecycle, nomes, caminhos, MIME e metadados válidos para cada asset;
- ausência de campos extras.

## Segurança

A fase não cria RPC pública nem aceita `user_id`. O acesso continua subordinado às políticas RLS de assets e grants. Não são expostos bucket interno, URL permanente ou credenciais de Storage além dos campos já contratados do asset.

## Escopo de ambiente

A implementação foi realizada exclusivamente na branch `dev`. Não houve alteração em `main`, Supabase remoto, produção ou credenciais.

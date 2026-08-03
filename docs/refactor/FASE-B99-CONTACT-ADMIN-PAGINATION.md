# FASE B99 — Paginação administrativa de contatos

## Objetivo

Remover o limite operacional que deixava a caixa administrativa presa às primeiras 100 solicitações de contato. A listagem passa a utilizar paginação no servidor com total filtrado, sem carregar toda a coleção no navegador.

## Read model

A migration `20260803043000_contact_admin_pagination.sql` mantém a assinatura de `get_contact_messages_admin(...)` e amplia o payload com:

- `summary`: contagens vitais por status, independentes da página atual;
- `total`: total filtrado antes da aplicação de `limit` e `offset`;
- `messages`: lote solicitado pela interface.

A consulta utiliza ordenação determinística por `submitted_at desc, id desc`, evitando sobreposição instável quando dois registros possuem o mesmo horário.

## Paginação no servidor

- cada página administrativa contém até 25 solicitações;
- busca e status são aplicados antes do total e da paginação;
- o cliente envia `p_limit` e `p_offset` conforme a página ativa;
- a quantidade de páginas deriva do total filtrado persistido;
- alterar busca ou status retorna à primeira página;
- os controles ficam bloqueados durante atualização da consulta.

## Segurança

A B99 não altera a fronteira de autorização existente:

- somente `administrador_proprietario` pode executar o read model;
- usuários autenticados sem esse papel recebem `ADMIN_REQUIRED`;
- `anon` permanece sem acesso à RPC administrativa;
- as tabelas de contatos e eventos continuam sem acesso direto pelo frontend;
- o limite máximo de 200 registros por chamada permanece aplicado no PostgreSQL.

## Cobertura

A suíte pgTAP B99 possui 22 asserções e valida:

- funções privada e pública;
- `SECURITY DEFINER` privado e `SECURITY INVOKER` público;
- isolamento do aluno;
- total filtrado;
- primeira, segunda e última página;
- ausência de sobreposição entre páginas;
- filtros de status e busca antes da paginação;
- resumo independente do tamanho da página;
- normalização de limites e offsets inválidos.

O contrato TypeScript exige `total` inteiro e não negativo. A interface e o hook são protegidos por checker estático encadeado ao gate B73.

## Escopo de ambiente

A implementação foi versionada exclusivamente na branch `dev`. Nenhuma migration B99 foi aplicada ao Supabase remoto e nenhuma alteração foi feita em `main` ou produção.

# FASE B98 — Paginação do suporte

## Objetivo

Garantir que aluno e proprietário consigam acessar todo o histórico persistido de tickets, sem ficarem limitados ao primeiro lote retornado pelas RPCs da FASE B39.

## Paginação no servidor

A implementação reutiliza as RPCs existentes:

- `get_my_support_tickets(p_limit, p_offset)` para o aluno;
- `get_support_admin_dashboard(..., p_limit, p_offset)` para o proprietário.

Os parâmetros `limit` e `offset` são enviados pelo cliente e aplicados no PostgreSQL antes da serialização do payload. A interface não carrega toda a coleção para depois recortá-la no navegador.

## Portal do aluno

- cada página contém até 10 tickets;
- o total persistido define a quantidade de páginas;
- os botões Anterior e Próxima ficam indisponíveis nos limites da coleção e durante atualização da consulta;
- a criação de um novo ticket retorna o aluno à primeira página, onde a solicitação mais recente será carregada;
- mensagens e respostas continuam vinculadas ao ticket retornado pela página atual.

## Administração

- cada página contém até 25 tickets;
- busca, status e prioridade continuam processados pela RPC administrativa;
- qualquer alteração de filtro retorna à primeira página;
- o total filtrado define a quantidade de páginas;
- o resumo vitalício do suporte permanece independente do lote exibido;
- respostas e mudanças de status continuam auditáveis e não alteram a posição da fila sem nova consulta.

## Segurança

A B98 não cria acesso direto às tabelas e não altera autorização:

- o aluno continua limitado a `auth.uid()`;
- o proprietário continua obrigado a possuir o papel `administrador_proprietario`;
- `anon` permanece sem acesso às RPCs de suporte;
- os limites máximos das funções continuam aplicados no banco;
- nenhum dado de outro aluno é transferido para paginação local.

## Cobertura

O contrato estático B98 valida:

- aplicação real de `limit` e `offset` nas duas consultas PostgreSQL;
- passagem dos parâmetros pelo cliente RPC e pelos query keys;
- páginas de 10 tickets para o aluno e 25 tickets para a administração;
- reset de página após criação ou mudança de filtros;
- controles acessíveis e bloqueados durante refetch;
- encadeamento permanente ao gate B39.

## Escopo de ambiente

A implementação foi versionada exclusivamente na branch `dev`. Nenhuma alteração foi feita em `main`, no Supabase remoto ou em produção.

# FASE B100 — Paginação das solicitações de privacidade

## Objetivo

Garantir que o titular e o proprietário consigam consultar todo o histórico persistido de solicitações de direitos de privacidade, sem ficarem limitados ao primeiro lote retornado pelas RPCs da FASE B44.

## Paginação no servidor

A B100 reutiliza os read models existentes:

- `get_my_privacy_rights_requests(p_limit, p_offset)` para o titular autenticado;
- `admin_get_privacy_rights_requests(..., p_limit, p_offset)` para o proprietário.

As consultas aplicam `limit` e `offset` no PostgreSQL antes da serialização. O total é calculado antes do recorte da página e continua protegido pela mesma fronteira de autorização.

## Portal do aluno

- cada página contém até 10 solicitações;
- a quantidade de páginas deriva do total persistido;
- a criação de uma nova solicitação retorna o aluno à primeira página;
- os botões Anterior e Próxima respeitam os limites da coleção;
- os controles ficam indisponíveis durante atualização da consulta;
- cancelamento, eventos e retorno administrativo permanecem vinculados somente às solicitações do próprio `auth.uid()`.

## Administração

- cada página contém até 25 solicitações;
- filtros de status e tipo são aplicados antes da paginação;
- alterar qualquer filtro retorna à primeira página;
- o total filtrado determina a quantidade de páginas;
- o proprietário continua visualizando apenas o lote solicitado, sem carregar toda a coleção no navegador;
- as transições administrativas e justificativas continuam auditáveis.

## Segurança e escopo legal

A paginação não modifica o domínio de privacidade:

- o aluno continua isolado por `auth.uid()`;
- somente `administrador_proprietario` acessa a fila administrativa;
- `anon` permanece sem execução das RPCs autenticadas;
- tabelas e eventos continuam sem acesso direto pelo frontend;
- a plataforma não executa exclusão automática;
- pedidos de exclusão continuam sujeitos à análise de obrigações legais, financeiras e de segurança.

## Cobertura

O checker B100 valida:

- aplicação de `limit` e `offset` nas duas consultas PostgreSQL;
- total não negativo no contrato estrito;
- chaves de cache distintas por página e filtros;
- dez solicitações por página no aluno;
- 25 solicitações por página na administração;
- reset de página após criação ou alteração de filtros;
- controles acessíveis e bloqueados durante refetch;
- ausência dos antigos limites fixos na primeira página;
- encadeamento permanente ao gate B44.

## Escopo de ambiente

A implementação foi versionada exclusivamente na branch `dev`. Nenhuma migration adicional foi necessária, nenhuma alteração foi feita em `main` e nenhuma operação foi executada no Supabase remoto ou em produção.

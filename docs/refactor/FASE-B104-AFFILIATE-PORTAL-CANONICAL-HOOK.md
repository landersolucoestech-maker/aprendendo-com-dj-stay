# FASE B104 — Hook canônico do portal do afiliado

## Problema corrigido

Após a paginação da B103, permaneciam dois caminhos de leitura para `get_affiliate_portal`:

- o hook paginado, validado pelo contrato com `totals`;
- o hook legado, que ainda usava o schema estrito anterior.

Embora a página principal já utilizasse o caminho novo, qualquer consumidor futuro do hook legado receberia o payload paginado e falharia em runtime porque o campo `totals` seria interpretado como campo extra.

## Implementação

`useAffiliatePortal` passou a ser um alias direto de `useAffiliatePortalPagination`.

Com isso:

- existe uma única chamada frontend para `get_affiliate_portal`;
- todos os consumidores recebem o contrato paginado;
- os argumentos normalizados e a chave de cache são compartilhados;
- o nome legado continua disponível para compatibilidade de importação;
- as invalidações por prefixo `affiliate/portal` permanecem válidas.

## Garantia

O arquivo de mutações do programa de afiliados não importa mais `affiliatePortalSchema`, não executa diretamente a RPC do portal e não possui uma segunda implementação de consulta.

## Ambiente

A alteração é versionada exclusivamente na branch `dev`. Não há mudança de banco nem promoção para produção.

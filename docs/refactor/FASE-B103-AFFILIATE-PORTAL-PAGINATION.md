# FASE B103 — Paginação do portal do afiliado

## Problema corrigido

O portal do afiliado recebia todas as ofertas, links, comissões e repasses em uma única resposta. Os eventos eram limitados aos 50 mais recentes no banco, mas não eram exibidos nem possuíam navegação na interface.

## Implementação

A função `get_affiliate_portal` passou a aplicar paginação independente em cinco coleções:

- ofertas disponíveis;
- links rastreáveis;
- comissões;
- repasses;
- eventos auditados.

Cada limite é normalizado entre 1 e 100 registros e cada offset negativo é normalizado para zero. A interface usa páginas de 10 registros, adequadas à leitura dos cards e tabelas do portal.

O perfil e o resumo financeiro vitalício permanecem fora da paginação. O payload adiciona `totals`, calculado exclusivamente para o afiliado autenticado.

## Ordenação

- ofertas: título, tipo e UUID;
- links: criação e UUID, ambos decrescentes;
- comissões: criação e UUID, ambos decrescentes;
- repasses: criação e UUID, ambos decrescentes;
- eventos: criação e UUID, ambos decrescentes.

A ordenação determinística impede sobreposição entre páginas adjacentes.

## Atividades recentes

A interface passou a renderizar uma seção de atividades recentes. Ela apresenta somente o tipo traduzido do evento e a data, sem expor IDs relacionados ou o conteúdo técnico de `details`.

## Segurança

A implementação privada permanece `SECURITY DEFINER` e exige o papel `afiliado`. O wrapper público permanece `SECURITY INVOKER`, sem `EXECUTE` para `anon`.

Todas as consultas usam o `auth.uid()` do chamador. Um aluno ou administrador não consegue usar o portal para consultar o histórico de outro afiliado.

Os dez argumentos possuem valores padrão, preservando chamadas SQL legadas sem criar uma função sobrecarregada de zero argumentos.

## Frontend

O hook paginado inclui limites e offsets na RPC e na chave do React Query. As invalidações existentes usam o prefixo `affiliate/portal`, portanto continuam atualizando todas as páginas após solicitações e mutações de links.

Ao criar ou desativar um link, as páginas de ofertas, links e eventos retornam ao início para refletir imediatamente a alteração persistida.

## Evidência automatizada

- migration `20260803060000_affiliate_portal_pagination.sql`;
- pgTAP `69_affiliate_portal_pagination.test.sql`, com 25 asserções;
- contrato Zod paginado e suíte unitária;
- hook, controle de paginação e interface;
- checker estático bloqueante encadeado ao contrato B20.

## Ambiente

A fase é versionada exclusivamente na branch `dev`. Nenhuma migration foi aplicada ao Supabase remoto ou à produção.

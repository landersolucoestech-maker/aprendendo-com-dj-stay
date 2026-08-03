# FASE B102 — Paginação da administração de afiliados

## Problema corrigido

O read model administrativo do programa de afiliados serializava todos os perfis, ofertas elegíveis, comissões disponíveis e repasses em um único JSON. O custo da consulta e o tamanho da resposta cresciam sem limite conforme o negócio acumulava dados.

## Implementação

A função `get_affiliate_admin_dashboard` passou a receber limites e offsets independentes para quatro coleções:

- perfis de afiliados;
- ofertas e termos;
- comissões disponíveis;
- histórico de repasses.

Cada limite é normalizado entre 1 e 100 registros. A interface administrativa usa páginas de 25 registros. Offsets negativos são normalizados para zero.

O payload preserva o resumo vitalício e adiciona `totals`, com a quantidade persistida de cada coleção. Os totais não dependem da página carregada.

## Ordenação

- perfis: data de criação decrescente, seguida do UUID do usuário;
- ofertas: título, tipo e UUID;
- comissões: data de criação e UUID;
- repasses: data de criação e UUID, ambos decrescentes.

As ordenações determinísticas impedem sobreposição ou troca arbitrária entre páginas adjacentes.

## Segurança

A implementação privada permanece `SECURITY DEFINER` e valida `affiliate_is_admin()`. O wrapper público permanece `SECURITY INVOKER`, executável somente por `authenticated`. Usuários anônimos não possuem `EXECUTE`; afiliados e alunos recebem `ADMIN_ROLE_REQUIRED`.

Os argumentos possuem valores padrão, portanto chamadas legadas sem argumentos continuam resolvendo a mesma função paginada sem criar uma sobrecarga adicional.

## Frontend

O hook inclui os oito parâmetros na chamada RPC e na chave do React Query. A página `/admin/afiliados` possui controles independentes para cada coleção e bloqueia a navegação durante refetch.

Ao criar ou cancelar um repasse, as páginas de comissões e repasses retornam ao início para evitar uma página vazia após a mudança de estado financeiro.

## Evidência automatizada

- migration `20260803053000_affiliate_admin_pagination.sql`;
- pgTAP `68_affiliate_admin_pagination.test.sql`, com 20 asserções;
- contrato Zod e suíte unitária independentes;
- checker estático bloqueante encadeado ao contrato B20.

## Ambiente

A fase é versionada exclusivamente na branch `dev`. Nenhuma migration foi promovida ao Supabase remoto ou à produção.

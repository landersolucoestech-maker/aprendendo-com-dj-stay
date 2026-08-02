# Fase B70 — Contratos do CMS de currículo

## Objetivo

Endurecer os contratos Zod de módulos, aulas, pré-requisitos, mídia, formulários e payloads do currículo, adicionando cobertura unitária determinística alinhada aos constraints e RPCs da fase B12.

## Problemas tratados

Os registros já possuíam validações estruturais, mas ainda aceitavam estados semanticamente impossíveis, como:

- modo de liberação incompatível com data ou intervalo;
- item arquivado sem timestamp de arquivamento;
- item excluído fora do estado arquivado;
- percentual de conclusão fora do modo `media_progress`;
- aula textual ou mista sem conteúdo textual;
- janela de disponibilidade invertida;
- pré-requisito autorreferente ou duplicado;
- mídia privada sem asset ou mídia externa sem identificador;
- conversões que não revalidavam o registro ou o formulário;
- valores ocultos incompatíveis mantidos no payload.

## Implementação

`src/contracts/curriculum-cms.ts` passa a exigir:

- contrato persistido exato para `immediate`, `scheduled`, `drip` e `after_prerequisites`;
- status arquivado com `archived_at` e exclusão somente em item arquivado;
- descrições e conteúdo textual normalizados e limitados;
- duração inteira não negativa;
- percentual apenas no modo de progresso de mídia;
- conteúdo textual obrigatório para aulas `text` e `mixed`;
- janela de disponibilidade ordenada;
- pré-requisitos persistidos não autorreferentes;
- listas de formulário sem duplicação ou autorreferência;
- ao menos um pré-requisito no modo `after_prerequisites`;
- mídia `private_asset` com asset e sem ID externo;
- mídia YouTube/Vimeo com ID externo e sem asset privado;
- formulários estritos e datetime-local validado semanticamente;
- payloads tipados e estritos para módulos e aulas;
- remoção determinística de data, intervalo e percentual incompatíveis;
- revalidação de registros e formulários nas conversões;
- preservação do instante temporal em roundtrips.

## Testes

`src/contracts/curriculum-cms.test.ts` cobre:

- os quatro modos persistidos de liberação;
- lifecycle arquivado e excluído;
- conclusão por mídia e conteúdo textual;
- duração e disponibilidade;
- pré-requisitos persistidos e de formulário;
- combinações válidas e inválidas de mídia;
- datetime-local inválido;
- campos extras;
- limpeza de valores ocultos nos payloads;
- revalidação nas duas direções;
- preservação de instantes por epoch, independente da grafia do offset.

## Contrato permanente

`scripts/check-curriculum-cms-tests.mjs` verifica:

- refinamentos e schemas obrigatórios;
- constraints da migration B12;
- regras RPC de duplicação, autorreferência e ciclo;
- cenários negativos obrigatórios da suíte;
- documentação e integração ao `typecheck`.

## Escopo excluído

- Nenhuma migration;
- nenhuma alteração de schema ou dados;
- nenhuma alteração em RPCs, hooks, páginas ou componentes;
- nenhuma escrita no Supabase remoto;
- nenhuma alteração na branch `main`.

## Critérios de aceite

- contrato B70 aprovado;
- lint aprovado;
- testes unitários aprovados;
- banco local e pgTAP aprovados;
- tipos sincronizados;
- TypeScript aprovado;
- build aprovado.

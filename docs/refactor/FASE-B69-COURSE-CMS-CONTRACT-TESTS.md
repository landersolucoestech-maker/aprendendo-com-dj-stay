# Fase B69 — Contratos e conversões do CMS de cursos

## Objetivo

Endurecer os contratos Zod do registro persistido e do formulário do CMS de cursos, adicionando cobertura unitária determinística alinhada aos constraints já existentes no PostgreSQL.

## Problemas tratados

O contrato anterior validava os tipos básicos, mas não reproduzia integralmente as relações persistidas entre:

- preço normal e promocional;
- início e fim da promoção;
- início e fim da disponibilidade;
- modo de liberação, data agendada e intervalo gradual;
- status publicado ou arquivado e seus timestamps;
- exclusão lógica e estado arquivado;
- limites dos arrays pedagógicos.

As funções de conversão também confiavam no tipo TypeScript recebido sem revalidar os dados em runtime.

## Implementação

### Registro persistido

`courseCmsRowSchema` passa a ser estrito e a exigir:

- slug, idioma e moeda nos formatos canônicos;
- valores monetários finitos e dentro do limite do campo `numeric(12,2)`;
- objetivos e pré-requisitos com até 50 itens de até 500 caracteres;
- preço promocional inferior ao normal;
- fim de promoção somente com início e em ordem cronológica;
- janela de disponibilidade em ordem cronológica;
- contrato exato dos modos imediato, agendado e gradual;
- timestamp de publicação para curso publicado;
- timestamp de arquivamento para curso arquivado;
- exclusão lógica somente em curso arquivado;
- timestamps com timezone ou offset.

### Formulário

`courseFormSchema` passa a ser estrito e valida:

- `datetime-local` no formato completo;
- preços e números opcionais provenientes de inputs HTML;
- limites das listas pedagógicas após divisão e trim;
- preço e janela promocional;
- janela de disponibilidade;
- data obrigatória no modo agendado;
- intervalo obrigatório no modo gradual.

Valores ocultos de outro modo de liberação continuam aceitos no estado do formulário para não bloquear a troca de seleção, mas são removidos deterministicamente no payload.

### Conversões

- `courseToFormValues` revalida o registro antes de preencher o formulário;
- `courseFormToPayload` revalida o formulário antes de produzir a entrada da RPC;
- textos são normalizados;
- strings vazias viram `null` quando aplicável;
- listas ignoram linhas vazias;
- datas locais são convertidas para instantes ISO;
- somente o campo temporal aplicável ao modo de liberação é enviado.

## Testes

`src/contracts/course-cms.test.ts` cobre:

- cursos imediatos, agendados, graduais, publicados, arquivados e excluídos;
- preços e janelas inválidas;
- contratos de liberação inválidos;
- listas pedagógicas acima dos limites;
- slug, moeda, preço, timestamp e campos extras;
- coerção controlada de inputs numéricos;
- datas locais inválidas;
- modos que exigem data ou intervalo;
- valores ocultos de outro modo;
- normalização do payload;
- remoção de campos temporais incompatíveis;
- revalidação nas duas funções de conversão;
- preservação do instante temporal no ciclo registro→formulário→payload.

## Contrato permanente

`scripts/check-course-cms-tests.mjs` verifica:

- primitivas, refinamentos e revalidações obrigatórias;
- alinhamento com os constraints da migration B11;
- cenários negativos essenciais da suíte;
- documentação e integração ao `typecheck`.

## Escopo excluído

- Nenhuma migration;
- nenhuma alteração de schema ou dados;
- nenhuma alteração em RPCs, hooks ou páginas;
- nenhuma publicação real de curso;
- nenhuma escrita no Supabase remoto;
- nenhuma alteração na branch `main`.

## Critérios de aceite

- contrato B69 aprovado;
- lint aprovado;
- testes unitários aprovados;
- banco local e pgTAP aprovados;
- tipos sincronizados;
- TypeScript aprovado;
- build aprovado.

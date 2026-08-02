# Fase B72 — contratos do marketplace digital

## Objetivo

Alinhar os contratos TypeScript/Zod do marketplace digital aos constraints PostgreSQL e aos registros retornados pelas RPCs da Fase B16.

A fase corrige divergências de modelo, adiciona coerência semântica e transforma as regras persistidas em cobertura unitária permanente.

## Correção do modelo de acesso

O banco define `digital_product_access_status` exclusivamente com:

- `active`;
- `revoked`.

O contrato anterior aceitava também `suspended` e declarava `suspended_at` e `suspension_reason`, colunas inexistentes em `digital_product_accesses`.

A B72 remove essa divergência. O schema agora contém exatamente os campos da tabela e reproduz o contrato de revogação:

- acesso ativo não possui timestamp nem motivo de revogação;
- acesso revogado exige timestamp e motivo;
- a expiração, quando presente, ocorre após a concessão;
- referência de origem e motivo respeitam os limites persistidos.

## Produtos digitais

`digitalProductSchema` passou a validar:

- título, slug e limites dos textos opcionais;
- preço não negativo e moeda em três letras maiúsculas;
- preço promocional não negativo e inferior ao preço principal;
- ordem das janelas de promoção e disponibilidade;
- versão positiva;
- publicação com `published_at`;
- arquivamento com `archived_at`;
- despublicação somente após uma publicação anterior;
- exclusão apenas em produto arquivado;
- rejeição de campos extras.

## Licenças e entregáveis

As licenças agora reproduzem:

- limites de título, resumo e termos;
- versão positiva;
- ciclo de vida `draft`, `published` e `archived` com timestamps coerentes.

Os entregáveis validam título, descrição opcional, posição não negativa, UUIDs, timestamps e estrutura estrita.

## Eventos

Foi criado `digitalProductEventTypeSchema` com todos os valores do enum PostgreSQL e `digitalProductEventSchema` com:

- referências opcionais a entregável, licença e acesso;
- ator opcional;
- versão positiva opcional;
- `details` obrigatoriamente como objeto JSON;
- timestamp com offset;
- rejeição de campos extras.

## Inputs administrativos

Os schemas de criação, atualização, lifecycle, licença e entregável validam UUIDs, versões, limites e normalizações antes das RPCs.

Foi adicionado um contrato específico para o identificador de licença usado nas mutações de lifecycle.

## Testes e gate

`src/contracts/marketplace.test.ts` cobre:

- estados válidos e combinações impossíveis;
- limites de slug e textos;
- promoção e disponibilidade;
- publicação, despublicação, arquivamento e exclusão;
- licença e entregável;
- acesso ativo e revogado;
- rejeição explícita de `suspended` e dos campos inexistentes;
- expiração e revogação;
- eventos canônicos;
- inputs normalizados, UUIDs, versões e campos extras.

`scripts/check-marketplace-contract-tests.mjs` vincula os contratos, testes, hooks, migrations, RPCs, documentação e `package.json`, bloqueando regressões no `typecheck`.

## Arquivos principais

- `src/contracts/marketplace.ts`
- `src/contracts/marketplace.test.ts`
- `src/hooks/useDigitalMarketplace.ts`
- `scripts/check-marketplace-contract-tests.mjs`
- `package.json`

## Exclusões deliberadas

Nenhuma migration foi criada ou alterada.

Nenhuma RPC, policy, grant, dado ou configuração do Supabase remoto foi alterado.

A branch `main` não foi modificada. Todo o trabalho permaneceu na branch `dev`.

## Validação esperada

A fase somente pode ser encerrada após o mesmo snapshot aprovar:

- instalação limpa;
- lint;
- testes unitários;
- Supabase CLI;
- banco local e pgTAP;
- geração de tipos;
- TypeScript;
- build.

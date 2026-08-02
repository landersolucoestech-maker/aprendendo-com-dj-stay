# Fase B79 — contratos canônicos de perfil e metadados

## Objetivo

Consolidar os contratos de perfil persistido e metadados públicos do usuário em um único módulo, eliminando diferenças de normalização entre leitura e gravação sem alterar o fluxo de avatar ou os contratos públicos existentes.

## Contrato canônico

Foi criado `src/contracts/profile.ts` com:

- `userProfileSchema` para a linha persistida em `user_profiles`;
- `profileMetadataInputSchema` para os dados gravados no Supabase Auth;
- `authUserMetadataSchema` para a leitura de `user_metadata`;
- schemas compartilhados de nome, telefone, biografia e URL HTTPS opcional;
- tipos `UserProfileRow`, `ProfileMetadataInput` e `AuthUserMetadata`.

As URLs:

- são normalizadas com `trim`;
- podem permanecer vazias nos campos opcionais;
- possuem limite de 500 caracteres;
- exigem URL completa com protocolo HTTPS quando preenchidas.

## Compatibilidade

`src/contracts/learning.ts` continua expondo:

- `userProfileSchema`;
- `profileMetadataInputSchema`;
- `UserProfileRow`;
- `ProfileMetadataInput`.

Esses símbolos agora são reexportações do módulo canônico, preservando todos os consumidores existentes.

`src/auth/user-metadata.ts` deixou de manter um segundo conjunto de schemas Zod e passou a utilizar `authUserMetadataSchema`.

A leitura continua:

- aceitando metadados adicionais do Supabase Auth;
- expondo apenas os campos públicos conhecidos;
- priorizando `full_name`, depois `name`, depois a parte local do email e, por último, `Aluno`.

## Consumidores preservados

- `EditProfile.tsx` continua validando antes de `supabase.auth.updateUser`;
- `useUserProfile.ts` continua validando a linha de `user_profiles` e o asset publicado do avatar;
- `useAvatarUpload.ts` continua confirmando o vínculo persistido do novo avatar antes de concluir o upload.

## Cobertura

`src/contracts/profile.test.ts` cobre:

- perfil persistido com e sem avatar;
- UUIDs, timestamps e campos adicionais;
- normalização dos campos antes da gravação;
- campos opcionais vazios;
- URLs HTTPS, protocolos inválidos e limites;
- metadados desconhecidos do Auth;
- reexportações por `learning.ts`.

A suíte existente `src/auth/user-metadata.test.ts` permanece como prova da leitura, dos fallbacks e da não exposição de metadados desconhecidos.

`scripts/check-profile-contract-tests.mjs` vincula contratos, testes, consumidores, tipos gerados, documentação e integração ao `typecheck`.

## Exclusões

- Nenhuma migration foi criada ou alterada.
- Nenhuma RPC foi criada ou alterada.
- Nenhum dado foi alterado.
- O Supabase Auth remoto não foi alterado.
- O Storage não foi alterado.
- Nenhum deploy de Edge Function foi executado.
- A branch `main` não foi alterada.

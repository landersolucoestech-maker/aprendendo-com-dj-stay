# Fase B75 — contratos do Storage privado

## Objetivo

Alinhar os contratos TypeScript/Zod do Storage privado aos constraints PostgreSQL e às RPCs da Fase B6.

A fase cobre registros de assets, tipos de arquivo, limites por propósito, lifecycle, eventos auditáveis, grants de acesso, URL assinada e o fluxo de avatar.

## Matriz propósito, extensão, MIME e tamanho

`assetRowSchema` reproduz a matriz implementada por `private.asset_type_allowed` e `private.asset_max_size_bytes`.

Cada propósito possui extensões, MIME types e tamanho máximo próprios. Entre os limites principais:

- avatar: 5 MB;
- imagem: 25 MB;
- documento e arquivo de suporte: 100 MB;
- vídeo: 5 GB;
- áudio e demais formatos de produção: 2 GB.

O schema valida também:

- extensão em minúsculas entre 1 e 16 caracteres;
- MIME em minúsculas e no formato `tipo/subtipo`;
- checksum SHA-256 em hexadecimal minúsculo;
- chave de idempotência entre 16 e 128 caracteres;
- nome original sem barras ou caracteres de controle;
- nome normalizado no conjunto seguro produzido pelo backend;
- metadata como objeto JSON;
- bucket fixo `private-assets`.

## Caminho e escopo

O caminho é validado contra o valor gerado pela tabela:

`v1/{owner_user_id}/{asset_id}.{extension}`

Avatar deve:

- possuir `lesson_id = null`;
- pertencer ao mesmo usuário que criou o asset;
- utilizar JPEG, PNG ou WebP;
- respeitar o limite de 5 MB.

## Lifecycle

O contrato reproduz os estados produzidos pelas RPCs:

- `pending`: nenhum timestamp de processamento;
- `uploaded`: exige `uploaded_at`;
- `processing`: exige upload e início de processamento;
- `published`: exige upload e publicação, podendo ter passado ou não por processamento;
- `failed`: exige `failed_at` e `failure_reason`.

Falhas podem ocorrer após intenção, upload, processamento ou publicação substituída. Por isso timestamps anteriores válidos são preservados no estado `failed`.

`deleted_at` somente é aceito em asset falho, pois a remoção física é registrada por `fail_asset_upload` com o estado final auditável.

## Eventos e grants

Foram adicionados:

- `assetEventTypeSchema` e `assetEventSchema` com todos os eventos persistidos;
- `assetAccessGrantSchema` com UUIDs, timestamps e expiração posterior à criação;
- schemas de coleção para eventos e grants.

A recência da expiração em relação ao relógio atual permanece na RPC `grant_asset_access`; o frontend valida deterministicamente a relação entre `expires_at` e `created_at` do registro retornado.

## URL assinada e download

`signedAssetUrlSchema` continua aceitando exclusivamente HTTPS.

`downloadPrivateAsset` permanece restrito a:

- asset publicado;
- asset não removido;
- URL assinada validada;
- fetch sem credenciais;
- cache desativado.

## Testes

`src/contracts/storage.test.ts` cobre:

- todos os propósitos com extensão, MIME e limite próprios;
- incompatibilidade de tipo e tamanho;
- caminho gerado e escopo de avatar;
- os cinco estados do lifecycle;
- falhas em etapas diferentes e avatar substituído;
- nome, MIME, idempotência, checksum e metadata;
- eventos e grants;
- URL HTTPS;
- arquivo de avatar válido, vazio, grande, com MIME ou nome inválido;
- UUIDs, timestamps e campos extras.

`scripts/check-storage-contract-tests.mjs` vincula contratos, testes, consumidores, migrations, RPCs, documentação e `package.json`.

## Consumidores preservados

- `useAvatarUpload` mantém validação do arquivo, intent, confirmação, publicação e limpeza de substituídos;
- `useLessonFiles` valida o identificador da aula e a lista de assets publicados;
- `private-assets.ts` valida a URL assinada e o estado do asset antes do download.

## Exclusões deliberadas

Nenhuma migration foi criada ou alterada.

Nenhuma RPC, policy, grant persistido, dado ou configuração do Supabase remoto foi alterado.

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

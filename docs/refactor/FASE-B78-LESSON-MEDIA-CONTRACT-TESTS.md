# Fase B78 — contratos administrativos de mídia das aulas

## Objetivo

Alinhar as entradas e respostas usadas pela administração de mídia das aulas aos constraints e parsers PostgreSQL já implantados na fase B10.

## Contratos endurecidos

`src/contracts/curriculum-cms.ts` passou a validar:

- identificador do YouTube com exatamente 11 caracteres alfanuméricos, `_` ou `-`;
- identificador do Vimeo com 6 a 12 dígitos;
- mídia privada exclusivamente com `asset_id` e sem identificador externo;
- mídia externa exclusivamente com identificador e sem asset privado;
- UUIDs de aula e asset;
- URL externa com no máximo 1000 caracteres;
- URLs do YouTube nos formatos `watch`, `youtu.be`, `embed` e `shorts` aceitos pela função `private.youtube_video_id`;
- URLs do Vimeo nos formatos público e `player.vimeo.com/video` aceitos pela função `private.vimeo_video_id`;
- correspondência obrigatória entre provedor e URL;
- objetos de entrada estritos, sem campos adicionais.

Foram adicionados:

- `youtubeVideoIdSchema`;
- `vimeoVideoIdSchema`;
- `externalLessonMediaInputSchema`;
- `privateLessonMediaInputSchema`;
- `disableLessonMediaInputSchema`.

## Consumidor

`src/hooks/useCurriculumCms.ts` passou a validar as entradas antes das RPCs:

- `upsert_external_lesson_media`;
- `upsert_private_lesson_media`;
- `disable_lesson_media`.

Os retornos continuam validados por `lessonMediaRowSchema` e `z.boolean()`.

## Cobertura

`src/contracts/lesson-media.test.ts` cobre:

- IDs persistidos válidos e inválidos;
- mídia privada, YouTube e Vimeo;
- coerência entre provedor, asset e identificador;
- todos os formatos de URL aceitos pelo PostgreSQL;
- incompatibilidade entre provedor e URL;
- HTTP, tamanho máximo, UUIDs e campos adicionais;
- entradas de mídia privada e desativação.

`scripts/check-lesson-media-contract-tests.mjs` vincula contratos, testes, consumidor, migration B10, documentação e integração ao `typecheck`.

## Exclusões

- Nenhuma migration foi criada ou alterada.
- Nenhuma RPC foi criada ou alterada.
- Nenhum dado foi alterado.
- Nenhum deploy de Edge Function foi executado.
- O Supabase remoto não foi alterado.
- A branch `main` não foi alterada.

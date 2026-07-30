# FASE B9 — Storage seguro e lifecycle de arquivos

Status: migration e integração em validação. A fase só será encerrada após reconstrução limpa, 140 testes pgTAP, tipos sem drift, frontend integrado e auditoria do Supabase `dev`.

## Inventário anterior

- zero buckets e zero objetos no Supabase `dev`;
- zero policies de `storage.objects`;
- avatar enviado para bucket público inexistente, com URL permanente persistida;
- materiais de aula representados por caminhos livres em `lesson_files`;
- ausência de intent, confirmação, lifecycle, idempotência, cleanup, grants individuais e auditoria.

## Topologia

Existe um único bucket `private-assets`, sempre privado. O limite global é de 5 GiB; limites inferiores e combinações de extensão/MIME são validados pela finalidade antes do upload.

O conhecimento do bucket ou do caminho não concede acesso. A autorização depende do registro em `public.assets`, da RLS e, para materiais de aula, de um grant individual e não expirado em `public.asset_access_grants`.

## Finalidades

- avatar;
- vídeo;
- áudio;
- imagem;
- documento;
- sample;
- preset;
- stem;
- projeto;
- arquivo compactado;
- template;
- arquivo de suporte;
- produto digital.

## Lifecycle

`pending → uploaded → processing → published`

Falhas transitam para `failed`. O registro permanece para auditoria; `deleted_at` confirma que o objeto foi removido. Um asset publicado não pode regressar para `failed` pela RPC de upload.

## Caminhos

```text
v1/<owner_user_id>/<asset_id>.<extensão>
```

O caminho é gerado pelo PostgreSQL, imutável, não reutiliza nomes e nunca é persistido como autorização. A aplicação referencia `asset_id`; URLs assinadas são temporárias e não são gravadas.

## RPCs controladas

- `prepare_asset_upload`;
- `confirm_asset_upload`;
- `transition_asset_state`;
- `fail_asset_upload`;
- `grant_asset_access`;
- `revoke_asset_access`.

As seis RPCs usam `SECURITY DEFINER`, `search_path` vazio, validação explícita de usuário/papel/ownership e revogação de execução para `PUBLIC` e `anon`.

## Perfil e materiais de aula

- `user_profiles.avatar_url` é removido;
- `user_profiles.avatar_asset_id` referencia um asset publicado;
- `lesson_files` é removida;
- materiais são consultados em `assets` por `lesson_id`, finalidade e estado;
- outro aluno não lê metadados ou objeto sem grant individual;
- a FASE B10 emitirá grants a partir de matrícula ou compra.

## Testes

A suíte totaliza 140 asserções pgTAP e cobre:

- enums, constraints, RLS, grants e privilégios;
- bucket privado e policies de Storage;
- upload de avatar do próprio usuário;
- idempotência e conflito de intent;
- tamanho, MIME e extensão;
- isolamento entre alunos mesmo conhecendo o caminho;
- publicação de material por administrador;
- concessão, renovação, expiração e revogação de acesso;
- objeto ausente e metadata mismatch;
- cleanup e eventos de auditoria;
- impossibilidade de invalidar asset publicado.

## Limites

- nenhum seed ou arquivo fictício será criado;
- processamento de mídia assíncrono será integrado em fase própria;
- grants comerciais dependem da modelagem de matrícula/compra da FASE B10;
- produção permanece somente leitura;
- nenhum deploy é executado nesta fase.

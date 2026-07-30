# FASE B9 — Storage seguro e lifecycle de arquivos

Status: concluída em `dev`, com banco, frontend, contratos e auditorias validados.

## Commits validados

```text
fb7c65d1463c1f648ebbce3a03ddd5ec34c04987
2944faa33a9881899fcc9e3ada724a67eda1c2bd
688c3d190986817e86cb6241898c0d5e82b4e73c
```

## Evidências automáticas

- workflow final de integração: `30570297090`;
- workflow de hardening das RPCs: `30571315949`;
- workflow dos índices de FK: `30571712180`;
- `npm ci`: success;
- lint: success;
- reconstrução local integral: success;
- pgTAP: 142 asserções aprovadas;
- tipos TypeScript sem drift: success;
- contratos estáticos, TypeScript estrito e build: success.

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

As seis funções expostas em `public` são wrappers `SECURITY INVOKER`, com `search_path` vazio e execução revogada para `PUBLIC` e `anon`. As implementações privilegiadas foram movidas para o schema não exposto `private`, usam `SECURITY DEFINER`, `search_path` vazio e validação explícita de usuário, papel, ownership e estado.

## Perfil e materiais de aula

- `user_profiles.avatar_url` foi removido;
- `user_profiles.avatar_asset_id` referencia um asset publicado;
- `lesson_files` foi removida;
- materiais são consultados em `assets` por `lesson_id`, finalidade e estado;
- outro aluno não lê metadados ou objeto sem grant individual;
- a FASE B10 emitirá grants a partir de matrícula ou compra;
- avatar e downloads utilizam URLs assinadas de curta duração;
- nenhum bucket ou arquivo público permanece no frontend.

## Testes

A suíte totaliza 142 asserções pgTAP e cobre:

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
- impossibilidade de invalidar asset publicado;
- wrappers públicos invoker e implementações privadas privilegiadas;
- índices de cobertura dos FKs de auditoria.

## Estado remoto do Supabase `dev`

- dez migrations registradas;
- oito tabelas públicas, todas com RLS ativa e zero registros;
- bucket `private-assets`, `public = false`, limite de 5 GiB e zero objetos;
- quatro policies em `storage.objects`;
- três policies de leitura nas tabelas de assets;
- zero privilégios de tabelas de assets para `anon`;
- zero alertas de segurança nos advisors;
- zero FKs sem índice;
- avisos restantes de performance limitados a índices ainda não utilizados em banco vazio e à configuração informativa de conexões do Auth.

## Limites

- nenhum seed ou arquivo fictício foi criado;
- processamento de mídia assíncrono será integrado em fase própria;
- grants comerciais dependem da modelagem de matrícula/compra da FASE B10;
- produção permaneceu somente leitura;
- nenhum deploy foi executado.

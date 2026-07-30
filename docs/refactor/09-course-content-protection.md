# FASE B10 — Matrícula, proteção de conteúdo e reprodução segura

Status: concluída no ambiente `dev`.

## Resultado

A plataforma deixou de conceder acesso ao curso apenas pelo papel `aluno`. O acesso acadêmico agora depende de matrícula ativa, curso publicado, janela temporal válida e autorização resolvida no PostgreSQL.

A reprodução de mídia foi separada do registro da aula. A coluna livre `aulas.video` foi removida e substituída por `lesson_media`, com provedores explícitos:

- asset privado no Supabase Storage;
- YouTube normalizado;
- Vimeo normalizado.

URLs externas são validadas e convertidas para embeds oficiais. O frontend não interpreta nem persiste URLs arbitrárias de vídeo.

## Matrículas e origem comercial

Foram criados:

- `courses`;
- `enrollments`;
- `enrollment_events`.

Uma matrícula registra:

- aluno;
- curso;
- estado;
- origem;
- referência da origem;
- confirmação de pagamento;
- início e expiração;
- suspensão, revogação e justificativa;
- ator responsável e eventos imutáveis.

Estados suportados:

```text
pending → active → suspended | revoked
```

A origem pode ser concessão manual ou compra. O navegador nunca confirma pagamento. A confirmação de compra exige `service_role`; concessões manuais, suspensões e revogações exigem ator confiável.

## RLS e acesso ao curso

As policies de `courses`, `modulos`, `aulas`, `progresso_aulas`, `lesson_media`, matrículas e eventos foram vinculadas ao contrato de matrícula.

O aluno somente lê o conteúdo quando:

- possui papel `aluno`;
- a matrícula está `active`;
- `starts_at` já foi atingido;
- `expires_at` não venceu;
- o curso está publicado.

Administrador proprietário mantém acesso administrativo. `anon` não possui privilégios nas tabelas B10.

## Grants de arquivos

Os grants de assets agora distinguem:

- concessão manual;
- concessão derivada de matrícula.

Suspensão, expiração ou revogação remove somente grants vinculados à matrícula, preservando concessões manuais independentes.

Assets publicados posteriormente para uma aula também podem ser sincronizados com matrículas ativas do curso.

## Tokens de reprodução

Foram criados:

- `playback_tokens`;
- `playback_events`;
- `request_lesson_playback_token`;
- `resolve_lesson_playback_token`.

O token é:

- opaco;
- aleatório por `pgcrypto` com schema explícito;
- armazenado somente como hash;
- associado ao usuário, matrícula, mídia, sessão Auth e fingerprint;
- válido por período curto;
- revogável;
- auditado em emissão, reprodução, negação e revogação.

Nenhuma resposta pública do PostgreSQL entrega bucket ou object path ao navegador.

## Edge Function `media-playback`

A função foi publicada exclusivamente no Supabase `dev` e está ativa na versão 2.

Ela:

- valida origem e bloqueia hotlink não autorizado;
- valida token e fingerprint;
- resolve a autorização por RPC privilegiada privada;
- cria URL assinada somente dentro do backend;
- transmite mídia privada com suporte a `Range`;
- usa `Cache-Control: private, no-store`;
- não expõe credencial de serviço;
- retorna somente embed normalizado ou stream temporário.

`verify_jwt=false` é intencional: o endpoint usa credencial de reprodução própria, curta e vinculada à sessão; toda validação ocorre no handler e no PostgreSQL.

## Frontend

Foram integrados:

- contrato de matrícula;
- consulta do acesso do aluno;
- solicitação de token de reprodução;
- fingerprint de sessão;
- player privado;
- embeds com sandbox e `referrerPolicy="no-referrer"`;
- estados de acesso negado, expirado ou indisponível;
- página de retorno de pagamento sem declarar sucesso antes da confirmação confiável.

A interface não exibe mais promessa fictícia de acesso vitalício.

## Validação

Commit funcional da integração:

```text
f07dab8d4873105c2935cb6cf0cfe355e2ab1cab
```

Commit do gate definitivo somente leitura:

```text
7dfc9dc93897ee50669bbf75e43181019c0e2f75
```

O gate definitivo aprovou:

- `npm ci`;
- lint;
- reconstrução integral do Supabase local;
- 238 asserções pgTAP;
- geração dos tipos TypeScript;
- ausência de drift dos tipos;
- TypeScript estrito;
- build de desenvolvimento.

## Estado remoto do Supabase `dev`

O histórico remoto contém as nove migrations B10. Foram confirmados:

- 14 tabelas públicas com RLS;
- seis tabelas B10 com RLS forçada;
- 21 policies relacionadas ao domínio acadêmico e reprodução;
- zero privilégios de tabela B10 para `anon`;
- zero funções `SECURITY DEFINER` em `public`;
- dois wrappers públicos de reprodução `SECURITY INVOKER`;
- zero alertas de segurança nos advisors;
- Edge Function `media-playback` ativa na versão 2.

As tabelas permanecem vazias; por isso os avisos de performance se limitam a índices ainda não utilizados e à configuração informativa de conexões do Auth. Índices estruturais não foram removidos sem carga real.

## Limites e produção

- nenhum gateway de pagamento foi integrado nesta fase;
- somente backend confiável pode confirmar uma compra;
- nenhuma matrícula, curso, mídia ou dado fictício foi criado;
- nenhum merge ou deploy foi feito em produção;
- o projeto principal e a branch `main` permaneceram intocados.

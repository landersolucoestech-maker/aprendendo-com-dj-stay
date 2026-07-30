# FASE B10 — Matrícula, compra e reprodução protegida

Status: concluída no GitHub e aplicada exclusivamente no Supabase `dev`.

## Evidência técnica

- commit final com workflow read-only: `2620bac680fe1864631e53eb9e0c30bb6a506b69`;
- reconstrução integral do banco aprovada;
- 242 asserções pgTAP aprovadas;
- tipos Supabase gerados sem drift;
- lint aprovado;
- TypeScript estrito aprovado;
- build de desenvolvimento aprovado;
- 19 migrations registradas no Supabase `dev` após a aplicação da fase;
- Edge Function `media-playback` implantada no `dev`, versão 1, status `ACTIVE`;
- produção não recebeu migration, função ou alteração de código.

## Matrícula e origem comercial

A autorização de conteúdo não depende mais apenas do papel `aluno`.

Foram adicionados:

- `courses`;
- `enrollments`;
- `enrollment_events`;
- estados `pending`, `active`, `suspended` e `revoked`;
- origens `manual_grant` e `purchase`;
- início e expiração do acesso;
- confirmação de compra vinculada a referência externa;
- renovação, suspensão e revogação;
- sincronização dos grants de assets por matrícula.

A confirmação de compra é aceita somente por `service_role`. O navegador não pode declarar que um pagamento foi confirmado. Concessões manuais, renovações, suspensões e revogações exigem administrador proprietário ou backend confiável, conforme a operação.

## RLS de conteúdo

Para alunos, a leitura de cursos, módulos, aulas, mídia e progresso exige:

1. papel `aluno` válido;
2. matrícula `active`;
3. `starts_at` já iniciado;
4. `expires_at` ausente ou futuro;
5. curso com estado `published`.

O administrador proprietário continua com acesso operacional integral. Afiliados e usuários autenticados anônimos não recebem acesso acadêmico.

## Mídia da aula

A coluna arbitrária `aulas.video` foi removida.

A tabela `lesson_media` aceita somente:

- `private_asset`;
- `youtube`;
- `vimeo`.

YouTube e Vimeo são normalizados para IDs de provedor. URLs de outros hosts são rejeitadas. O embed é construído exclusivamente no backend com os hosts oficiais:

- `youtube-nocookie.com`;
- `player.vimeo.com`.

Vídeos privados precisam apontar para um asset publicado, não removido e fisicamente existente no bucket privado.

## Token de reprodução

O navegador solicita `request_lesson_playback_token` com o ID da aula e um fingerprint de sessão.

O token:

- possui 48 caracteres hexadecimais;
- expira em cinco minutos;
- é vinculado ao usuário, sessão Auth, mídia, matrícula e fingerprint;
- nunca é persistido em texto aberto;
- é armazenado somente como SHA-256;
- revoga o token anterior da mesma sessão/mídia durante renovação;
- é revogado quando a matrícula deixa de estar ativa;
- gera watermark de sessão sem expor e-mail.

O resolvedor que pode retornar bucket e object path é executável somente por `service_role`. `authenticated` pode solicitar e revogar o próprio token, mas não pode resolver caminhos privados.

## Edge Function `media-playback`

A função valida a credencial opaca internamente e, por isso, utiliza `verify_jwt = false` de forma intencional.

Ela aplica:

- allowlist de `Origin`/`Referer`;
- validação de token e fingerprint;
- resolução via RPC exclusiva de `service_role`;
- URL assinada de Storage criada somente no backend;
- proxy de `Range` para mídia privada;
- `Cache-Control: private, no-store`;
- `Content-Disposition: inline`;
- bloqueio de redirects upstream;
- ausência de bucket e object path nas respostas JSON ao navegador.

Na ausência do secret `PLAYBACK_ALLOWED_ORIGINS`, a função permite apenas os ambientes locais de desenvolvimento:

- `http://127.0.0.1:8080`;
- `http://localhost:8080`;
- `http://127.0.0.1:5173`;
- `http://localhost:5173`.

Antes de usar um frontend hospedado, o domínio exato desse ambiente deve ser incluído em `PLAYBACK_ALLOWED_ORIGINS` no Dashboard do Supabase. Não foi inventada nenhuma origem pública durante esta fase.

## Auditoria remota

O Supabase `dev` ficou com:

- 14 tabelas públicas, todas com RLS ativa;
- zero registros fictícios;
- zero privilégios de tabela para `anon` nas tabelas B10;
- zero `SECURITY DEFINER` em `public`;
- resolver privado executável por `service_role` e bloqueado para `authenticated`;
- todas as funções privadas privilegiadas com `search_path` vazio;
- zero alertas no advisor de segurança.

Os avisos de performance restantes são somente índices ainda sem uso porque o banco está vazio e a configuração informativa de conexões do Auth. Os índices estruturais não serão removidos sem tráfego e planos de execução reais.

## Produção

- branch GitHub `main`: não alterada;
- projeto Supabase de produção: não recebeu migrations;
- nenhuma Edge Function foi implantada em produção;
- nenhum merge da branch Supabase `dev` foi executado.

# Fase B77 — contratos e testes do playback protegido

## Objetivo

Endurecer as fronteiras de emissão, resolução e revogação do playback das aulas, alinhando o frontend e a Edge Function aos contratos já persistidos pelas migrations e RPCs B10.

## Alterações realizadas

### Contratos do frontend

`src/contracts/playback.ts` passou a validar:

- token hexadecimal minúsculo com 48 caracteres;
- fingerprint hexadecimal minúsculo com 64 caracteres;
- credenciais estritas, sem campos adicionais;
- exatamente uma linha na resposta de emissão;
- emissão concedida e emissão negada como união discriminada;
- motivo nulo em concessões e motivo canônico em negações;
- ausência de token, expiração, provedor e watermark em emissões negadas;
- timestamps com timezone;
- watermark não vazio e limitado a 120 caracteres;
- `private_asset` exclusivamente com `streamUrl` do gateway, token e fingerprint válidos;
- YouTube exclusivamente pelo domínio `www.youtube-nocookie.com`;
- Vimeo exclusivamente pelo domínio `player.vimeo.com`;
- erros canônicos e estritos do gateway.

Os exports públicos `playbackTokenResponseSchema`, `playbackGatewayResponseSchema`, `LessonMediaProvider` e `PlaybackGatewayResponse` foram preservados.

### Parser da Edge Function

Foi criado `supabase/functions/_shared/playback-contract.ts`, sem dependências de runtime do navegador ou do Deno, para validar a linha retornada por `resolve_lesson_playback_token`.

O parser rejeita:

- objetos incompletos ou com campos adicionais;
- motivos desconhecidos;
- timestamps e watermark inválidos;
- mídia privada sem bucket, caminho ou MIME;
- mídia privada com embed externo;
- YouTube ou Vimeo com armazenamento privado;
- embeds com domínio, provedor ou identificador incompatível;
- negações contendo dados de mídia concedida.

`supabase/functions/media-playback/index.ts` deixou de converter a resposta da RPC por cast direto e passou a exigir `parsePlaybackResolution`. Uma resposta incompatível é tratada como falha de resolução, sem expor o payload recebido.

### Consumidor

`src/hooks/useLessonPlayback.ts` agora valida:

- UUID da aula;
- fingerprint gerado pelo dispositivo;
- credenciais enviadas à Edge Function;
- resposta da RPC de emissão;
- resposta do gateway;
- token enviado à RPC de revogação.

A união discriminada elimina estados impossíveis e permite tratar uma emissão negada antes de acessar token, provedor ou expiração.

## Cobertura

- `src/contracts/playback.test.ts`: contratos Zod, limites, campos extras, concessões, negações, URLs por provedor e erros do gateway.
- `src/contracts/playback-edge.test.ts`: parser puro da resposta da RPC, incluindo mídia privada, YouTube, Vimeo, negações e payloads incompatíveis.
- `scripts/check-playback-contract-tests.mjs`: vincula contratos, testes, parser, Edge Function, hook, migrations/RPCs e integração ao `typecheck`.

## Exclusões

- Nenhuma migration foi criada ou alterada.
- Nenhuma RPC foi criada ou alterada.
- Nenhum dado foi alterado.
- Nenhum deploy de Edge Function foi executado.
- O Supabase remoto não foi alterado.
- A branch `main` não foi alterada.

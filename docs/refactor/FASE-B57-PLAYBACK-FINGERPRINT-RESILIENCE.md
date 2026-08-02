# Fase B57 — Resiliência e testes do fingerprint de reprodução

## Objetivo

Proteger a geração do fingerprint usado na emissão de tokens de reprodução e impedir que indisponibilidade do `sessionStorage` interrompa o fluxo de mídia protegida.

## Problema confirmado

A implementação original lia e gravava o nonce diretamente no `sessionStorage`. Em navegadores ou contextos que bloqueiam storage, uma exceção de leitura ou escrita interrompia `getPlaybackFingerprint` antes do cálculo SHA-256.

O nonce de sessão melhora a estabilidade do fingerprint, mas storage não deve se tornar requisito absoluto para iniciar a reprodução.

## Endurecimento

A leitura e a gravação foram separadas em operações best-effort:

- falha de leitura é tratada como ausência de nonce;
- um novo UUID é gerado quando não existe valor recuperável;
- falha de gravação não impede o uso do nonce gerado na chamada atual;
- nonce existente continua sendo reutilizado sem nova geração ou sobrescrita;
- algoritmo, composição da fonte e saída hexadecimal permanecem inalterados.

## Suíte

`src/lib/playback-fingerprint.test.ts` simula explicitamente:

- `window.sessionStorage`;
- resolução da tela;
- `navigator.userAgent` e idioma;
- timezone resolvido pelo `Intl`;
- `crypto.randomUUID`;
- `crypto.subtle.digest`.

A cobertura inclui:

- reutilização do nonce existente;
- ausência de geração e escrita quando o nonce já existe;
- geração e persistência quando ausente;
- continuidade após falha de leitura;
- continuidade após falha de escrita;
- composição determinística da fonte;
- uso de SHA-256;
- conversão byte a byte para hexadecimal com padding;
- restauração de globals e mocks após cada teste.

A suíte usa digest controlado para testar a conversão hexadecimal sem substituir o contrato de produção do Web Crypto.

## Contrato permanente

`scripts/check-playback-fingerprint-tests.mjs` valida:

- chave canônica da sessão;
- leitura e escrita protegidas por fallbacks independentes;
- geração via `crypto.randomUUID`;
- preservação de SHA-256 e saída hexadecimal;
- permanência dos cenários de sucesso e falha de storage;
- script npm dedicado;
- integração do contrato B57 ao `typecheck`.

## Limites de segurança

O fingerprint é um sinal técnico de sessão, não um autenticador e não substitui sessão Supabase, autorização, RLS ou validação server-side do token de reprodução.

Quando o storage não pode persistir o nonce, a chamada atual continua funcional, mas chamadas posteriores podem produzir outro fingerprint. Esse comportamento é preferível a bloquear completamente a reprodução.

## Escopo excluído

- nenhuma alteração no algoritmo SHA-256;
- nenhuma alteração no conteúdo base do fingerprint;
- nenhuma alteração em RPC, Edge Function ou token de reprodução;
- nenhuma dependência nova;
- nenhuma migration ou dado alterado;
- nenhum projeto Supabase ou branch `main` alterado.

## Critérios de aceite

- suíte unitária completa aprovada;
- contrato B57 aprovado;
- lint aprovado;
- Supabase CLI configurada;
- banco e pgTAP aprovados;
- tipos sincronizados;
- TypeScript aprovado;
- build aprovado.

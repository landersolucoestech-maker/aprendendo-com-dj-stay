# FASE B128 — Isolamento de rede do runtime público

## Problema comprovado

Os artefatos de rede B127 eliminaram chamadas ao Supabase remoto e respostas HTTP falhas, mas registraram duas requisições externas em cada uma das oito rotas públicas:

- folha CSS em `fonts.googleapis.com`;
- arquivo WOFF2 em `fonts.gstatic.com`.

A origem era um `@import` remoto da família Inter em `src/index.css`. Isso mantinha o runtime público dependente da disponibilidade, política e latência de um terceiro para renderizar tipografia.

## Implementação

O `@import` do Google Fonts foi removido. A família `font-sans` passou a usar somente a stack nativa:

```text
ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif
```

Nenhum arquivo de fonte foi adicionado ao repositório e nenhuma fonte foi baixada ou redistribuída.

O script `check-browser-network-isolation.mjs` consome os oito artefatos `<rota>.network.json` produzidos pelo CDP. Para cada rota, ele exige exatamente uma requisição principal do tipo `Document`, confirma que o documento foi servido por loopback e deriva sua origem completa, incluindo a porta efêmera do `vite preview`.

Toda requisição HTTP ou HTTPS da rota deve utilizar exatamente a mesma origem do documento principal. Portanto, o gate rejeita tanto serviços externos quanto outro serviço local executado em uma porta diferente. Protocolos internos do navegador que não representam tráfego HTTP, como `data:`, não são classificados como dependência externa.

O resumo `external-network-summary.json` registra:

- as oito rotas verificadas;
- a origem permitida de cada documento;
- a quantidade de requisições fora da origem;
- os métodos, URLs e origens permitidas quando houver falha.

## Contrato permanente

O gate rejeita:

- `fonts.googleapis.com`;
- `fonts.gstatic.com`;
- `@import url(...)` no stylesheet principal;
- retorno da família Inter como primeira opção sem asset local contratado;
- remoção do verificador pós-CDP do workflow;
- matriz de rede incompleta;
- ausência ou duplicidade do documento principal;
- qualquer requisição HTTP ou HTTPS fora da origem e porta exatas do documento servido.

## Limites

Esta fase comprova isolamento de rede das oito rotas públicas no build sintético. Ela não proíbe integrações externas legítimas em fluxos autenticados ou de pagamento; esses fluxos precisam de contratos e homologação próprios.

A stack tipográfica nativa pode variar visualmente entre sistemas operacionais. A garantia desta fase é funcional e operacional: nenhuma fonte externa é necessária para renderizar o shell público.

## Exclusões

- Nenhuma migration foi criada ou alterada.
- O Supabase remoto não foi modificado.
- A branch `main` não foi alterada.
- Nenhum arquivo de fonte foi versionado.
- Nenhuma dependência ou lockfile foi alterado.

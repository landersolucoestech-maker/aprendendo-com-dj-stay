# FASE B137 — teclado e foco do menu móvel

## Causa comprovada

O componente `Navigation` já implementava duas garantias específicas para teclado quando o menu móvel era aberto:

- foco automático no primeiro controle de `#mobile-navigation`;
- fechamento por `Escape`, com `preventDefault()` e retorno do foco ao botão do menu no próximo frame.

A prova B136 exercitava apenas os cliques confiáveis no botão e no link `Entrar`. Portanto, o código de teclado podia regredir sem quebrar o gate do navegador.

## Correção aplicada

O mesmo `run-browser-mobile-navigation-smoke.mjs` agora executa uma sequência única e real:

1. abre o menu por `Input.dispatchMouseEvent`;
2. exige foco no primeiro controle do menu, o botão `Início`;
3. envia `Escape` por `Input.dispatchKeyEvent`;
4. exige evento `keydown` confiável e `defaultPrevented === true` após o handler do documento;
5. exige menu desmontado, `aria-expanded="false"`, rótulo `Abrir menu` e foco devolvido ao botão com `aria-controls="mobile-navigation"`;
6. reabre o menu por clique confiável;
7. aciona o link móvel `Entrar` e preserva todas as garantias B136 de rota, foco, anúncio e rede.

A sonda de teclado é instalada em `window`, depois do ponto de propagação em que o handler do componente no `document` chama `preventDefault()`. Assim, o artifact comprova o efeito real do handler, não apenas a emissão da tecla.

## Evidência

`mobile-navigation.evidence.json` passa a incluir:

- estado com foco inicial dentro do menu;
- eventos de teclado com `key`, `code`, `isTrusted` e `defaultPrevented`;
- estado após `Escape`;
- dois cliques confiáveis no botão — abertura e reabertura;
- clique confiável no link `Entrar`;
- estado final e resumo de rede.

## Gate bloqueante

O contrato estático exige `Input.dispatchKeyEvent`, `Escape`, a sonda em `window`, foco inicial em `Início`, retorno ao botão do menu e ausência de `KeyboardEvent` artificial ou `dispatchEvent`.

Uma regressão no efeito React, no seletor dos controles focáveis, em `preventDefault`, em `requestAnimationFrame`, no retorno do foco ou no fluxo posterior de login bloqueia o estágio do navegador.

## Limites

- A prova usa a viewport móvel canônica de 390 × 844.
- Nenhuma credencial foi criada ou alterada.
- Supabase remoto não foi modificado.
- Nenhuma migration, dependência ou lockfile foi alterado.
- Produção e branch `main` permanecem sem promoção.

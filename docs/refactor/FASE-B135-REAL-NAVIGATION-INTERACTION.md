# FASE B135 — interação real na navegação client-side

## Causa comprovada

O smoke de transferência de foco navegava para `/login` executando diretamente `window.history.pushState` e emitindo um `PopStateEvent`. Essa técnica exercitava o roteador e o conteúdo lazy, mas não comprovava que o controle público existente na interface podia realmente ser localizado, atingido e acionado pelo navegador.

A home já possui um link real `Entrar` dentro de `nav[aria-label="Navegação principal"]`, apontando para `/login`. Portanto, fabricar a mudança de histórico contornava exatamente o ponto de entrada que o usuário utiliza.

## Correção aplicada

`scripts/run-browser-client-navigation-smoke.mjs` agora:

- localiza todos os links compatíveis com `nav[aria-label="Navegação principal"] a[href="/login"]`;
- seleciona somente um link real `Entrar` visível, com dimensões positivas;
- confirma por `document.elementFromPoint` que o link é o alvo superior nas coordenadas escolhidas;
- instala uma sonda no evento real de clique;
- aciona o controle por `Input.dispatchMouseEvent` do Chrome DevTools Protocol;
- exige `event.isTrusted === true`, texto `Entrar` e destino `/login`;
- persiste alvo e evento em `client-navigation.interaction.json`;
- mantém as provas de fallback lazy nunca focado, foco final, live region e isolamento de rede;
- mantém exatamente um `Document` inicial e nenhum novo `Document` na transição.

O script não contém mais `window.history.pushState`, `PopStateEvent` ou emissão manual de evento de navegação.

## Gate bloqueante

`scripts/check-route-focus-handoff.mjs` exige:

- seletor do link real;
- validação do alvo por coordenadas;
- `Input.dispatchMouseEvent` com pressão e liberação do botão esquerdo;
- captura de `event.isTrusted`;
- artifact `client-navigation.interaction.json`;
- ausência das APIs de navegação artificial;
- permanência das garantias B125 e B132.

Uma regressão no link, na visibilidade, no hit target, no roteamento React, no carregamento lazy, no foco, no anúncio ou na rede bloqueia o mesmo estágio do navegador.

## Limites

- Nenhuma credencial foi criada ou alterada.
- Supabase remoto não foi modificado.
- Nenhuma migration, dependência ou lockfile foi alterado.
- A prova cobre o controle público desktop em viewport de 1440 × 1000; não substitui uma suíte E2E autenticada completa.

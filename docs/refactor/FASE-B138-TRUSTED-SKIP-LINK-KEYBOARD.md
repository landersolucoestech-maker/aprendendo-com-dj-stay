# FASE B138 — skip link confiável por teclado

## Causa comprovada

A matriz pública exigia a presença de exatamente um link `Pular para o conteúdo principal`, e os contratos unitários cobriam o handler `handleSkipToContent`. Porém, o gate do navegador não comprovava o caminho real do teclado:

- o primeiro `Tab` alcançar o skip link;
- o controle tornar-se visível quando focado;
- `Enter` produzir um clique confiável;
- o handler prevenir a navegação pelo fragmento;
- o foco terminar no `#main-content` conectado ao DOM.

A existência estática do link não prova que ordem de tabulação, estilos de foco, evento React e foco programático funcionam juntos no artefato servido.

## Correção aplicada

O smoke desktop `run-browser-client-navigation-smoke.mjs` agora, antes da transição para `/login`:

1. instala sondas de teclado e clique no skip link;
2. envia `Tab` por `Input.dispatchKeyEvent`;
3. exige um `<a href="#main-content">` ativo, visível, conectado e com texto `Pular para o conteúdo principal`;
4. envia `Enter` por `Input.dispatchKeyEvent`;
5. exige `keydown` confiável, clique confiável e `defaultPrevented === true` após o handler React;
6. exige permanência na rota `/` e foco em `#main-content` conectado;
7. somente depois instala a sonda lazy B125 e aciona o link real `Entrar` da prova B135.

A sequência mantém as garantias de rede B132: um único `Document` inicial, nenhum novo `Document`, mesma origem e zero resposta HTTP com status maior ou igual a 400.

## Evidência

O artifact `client-navigation.skip-link.json` preserva:

- estado do foco após `Tab`;
- eventos de teclado;
- evento de clique gerado pelo teclado;
- estado após ativação;
- seletor e destino do controle.

## Gate bloqueante

O contrato estático exige `Input.dispatchKeyEvent`, `Tab`, `Enter`, evento confiável, visibilidade do controle, `defaultPrevented`, foco no conteúdo principal e ausência de `HTMLElement.focus()` usado pelo smoke para fabricar o resultado.

Também proíbe `new KeyboardEvent`, `dispatchEvent`, `history.pushState` e `PopStateEvent` no caminho de prova.

## Limites

- A prova usa o Chrome headless e a viewport desktop canônica.
- Nenhuma credencial foi criada ou alterada.
- Supabase remoto não foi modificado.
- Nenhuma migration, dependência ou lockfile foi alterado.
- Produção e branch `main` permanecem sem promoção.

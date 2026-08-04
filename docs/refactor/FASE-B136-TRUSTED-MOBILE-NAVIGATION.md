# FASE B136 — navegação móvel confiável

## Causa comprovada

A prova B135 exercitava o link desktop `Entrar` em viewport de 1440 × 1000. A navegação responsiva possui um fluxo diferente: em larguras menores que `md`, o usuário precisa acionar o botão `Abrir menu`, aguardar `#mobile-navigation` e somente então usar o link móvel `Entrar`.

Esse caminho possui estado React próprio, `aria-expanded`, mudança de rótulo, montagem condicional do menu e fechamento no clique do link.

A primeira execução do smoke móvel comprovou que o botão abriu o menu, o link navegou para `/login`, o foco terminou correto e a rede permaneceu limpa. Porém, a sonda instalada na fase bubble não registrou o clique do botão: o handler React já havia trocado o ícone `Menu` por `X`, desconectando o alvo original antes que o listener do documento resolvesse o ancestral.

## Correção aplicada

`scripts/run-browser-mobile-navigation-smoke.mjs` executa uma sessão dedicada em viewport móvel de 390 × 844 e:

- exige o botão visível com `aria-controls="mobile-navigation"`, `aria-expanded="false"` e rótulo `Abrir menu`;
- confirma cada hit target por `document.elementFromPoint`;
- instala a sonda de clique na fase capture, antes das mutações React do DOM;
- aciona o botão por `Input.dispatchMouseEvent` e exige evento confiável;
- espera `#mobile-navigation`, `aria-expanded="true"` e rótulo `Fechar menu`;
- localiza o link real `#mobile-navigation a[href="/login"]` com texto `Entrar`;
- aciona o link por evento confiável do Chrome;
- exige `/login`, conteúdo final, menu desmontado, foco em `#main-content`, target conectado e anúncio da navegação;
- captura exceções JavaScript, requests e responses pelo CDP;
- exige exatamente um `Document` inicial, nenhum novo `Document` na transição, mesma origem e zero HTTP com status maior ou igual a 400;
- persiste `mobile-navigation.evidence.json`, HTML final, runtime e logs dos processos.

## Gate bloqueante

O smoke móvel roda no mesmo estágio do navegador, depois da prova desktop e antes do verificador consolidado das oito rotas e da transição desktop.

O contrato estático exige `document.addEventListener("click", ..., true)` para preservar a captura anterior à substituição do ícone e proíbe substituição por `HTMLElement.click`, `dispatchEvent`, `history.pushState` ou `PopStateEvent`. A prova precisa continuar usando `Input.dispatchMouseEvent` e eventos com `isTrusted === true`.

## Limites

- A prova valida uma viewport móvel canônica; não substitui matriz completa de dispositivos.
- Nenhuma credencial foi criada ou alterada.
- Supabase remoto não foi modificado.
- Nenhuma migration, dependência ou lockfile foi alterado.
- Produção e branch `main` permanecem sem promoção.

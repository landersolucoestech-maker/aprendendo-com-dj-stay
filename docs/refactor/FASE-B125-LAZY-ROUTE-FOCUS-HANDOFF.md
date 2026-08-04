# FASE B125 — Transferência de foco após navegação lazy

## Problema comprovado

A reconciliação B123 garante que o landmark final receba `#main-content` após a substituição do `Suspense`. Contudo, durante uma navegação client-side, o efeito anterior podia focar o `<main aria-busy="true">` do fallback e atualizar imediatamente o pathname processado.

Quando o lazy chunk substituía esse fallback, o nó focado era removido. O observer preparava o novo landmark, mas não transferia o foco porque a rota já havia sido marcada como concluída.

## Implementação

Os fallbacks de rota e autenticação recebem o marcador:

```text
data-route-focus-deferred="true"
```

`RouteAccessibility` continua preparando `id`, landmark e tabindex nesses estados, mas não:

- move o foco;
- anuncia conclusão;
- atualiza `previousPathRef`.

A navegação permanece pendente. Quando o `MutationObserver` detecta a substituição do fallback pelo conteúdo final, o próximo frame:

1. prepara o landmark final;
2. confirma que o marcador de foco diferido não está presente;
3. move o foco para `#main-content`;
4. publica `Navegação concluída. Conteúdo principal atualizado.`;
5. registra o pathname como concluído.

## Evidência no Chrome

O smoke B125 abre a home e executa uma navegação client-side para `/login` no mesmo target. Antes da transição, o CDP limita temporariamente a rede para tornar o fallback lazy observável.

Uma sonda DOM registra:

- se um fallback com foco diferido apareceu;
- se esse fallback recebeu foco em algum momento;
- o pathname final;
- o elemento ativo final;
- o anúncio da live region.

O gate exige:

- fallback observado;
- fallback nunca focado;
- conteúdo final de login renderizado;
- zero marcadores de foco diferido restantes;
- `document.activeElement.id === "main-content"`;
- elemento ativo conectado ao DOM;
- anúncio de conclusão presente;
- zero exceções JavaScript não tratadas.

## Contrato permanente

Os contratos B125 impedem:

- remover o marcador dos fallbacks;
- atualizar `previousPathRef` enquanto o foco está diferido;
- focar ou anunciar durante o fallback;
- remover a prova de navegação client-side do Chrome;
- substituir a prova por navegação HTTP completa.

## Limites

A fase valida uma transição lazy pública representativa. Ela não substitui navegação manual por teclado, leitor de tela ou E2E autenticado.

## Exclusões

- Nenhuma migration foi criada ou alterada.
- O Supabase remoto não foi modificado.
- A branch `main` não foi alterada.
- Nenhuma dependência ou lockfile foi alterado.

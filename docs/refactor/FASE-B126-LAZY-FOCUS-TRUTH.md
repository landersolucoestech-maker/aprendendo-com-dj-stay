# FASE B126 — Verdade consolidada da transferência de foco lazy

## Objetivo

Registrar como verdade operacional somente o comportamento comprovado pelo B125 no mesmo snapshot do gate técnico completo.

## Evidência aprovada

O commit `03106954c5ed0d9238a55625f4c30cf7e83a4699` foi aprovado por:

- instalação limpa e lint;
- 795 testes unitários;
- reconstrução local do Supabase;
- 1.878 testes pgTAP;
- sincronização de tipos, contratos e TypeScript;
- build e smoke HTTP;
- matriz acessível de oito rotas públicas;
- navegação client-side lazy da home para `/login`.

A sonda exportada pelo Chrome confirmou:

- o fallback com `data-route-focus-deferred="true"` foi observado;
- o fallback nunca recebeu foco;
- o conteúdo final de login foi renderizado;
- nenhum marcador de foco diferido permaneceu no DOM;
- `document.activeElement.id` terminou como `main-content`;
- o elemento ativo permaneceu conectado ao DOM;
- a live region publicou `Navegação concluída. Conteúdo principal atualizado.`;
- nenhum evento `Runtime.exceptionThrown` ocorreu.

## Comportamento consolidado

Durante uma transição lazy, fallbacks de rota ou autenticação podem receber landmark e `tabindex` para manter a estrutura válida, mas não concluem a navegação acessível.

Enquanto `data-route-focus-deferred="true"` estiver presente, `RouteAccessibility` não move o foco, não anuncia conclusão e não atualiza o pathname processado. O foco é transferido somente para o conteúdo final.

Se o target final previamente focado for substituído por outro nó do mesmo fluxo, a referência desconectada é detectada e o foco é restaurado no novo `#main-content`. Mutações que preservem o target atual não causam refoco.

## Contrato permanente

A verdade operacional deve continuar exigindo:

- marcador de foco diferido nos dois fallbacks;
- navegação client-side real, sem reload HTTP;
- fallback observado e nunca focado;
- target final conectado e focado;
- anúncio de conclusão;
- evidência verde do commit `03106954c5ed0d9238a55625f4c30cf7e83a4699`.

## Limites

A prova representa uma transição lazy pública. Ela não substitui leitor de tela, navegação manual por teclado, E2E autenticado, homologação financeira ou pentest.

## Exclusões

- Nenhuma migration foi criada ou alterada.
- O Supabase remoto não foi modificado.
- A branch `main` não foi alterada.
- Nenhuma dependência ou lockfile foi alterado.

# FASE B123 — Prontidão acessível dos artefatos do navegador

## Problema comprovado

A inspeção dos artefatos de um gate verde anterior mostrou uma diferença temporal relevante:

- a home já possuía `id="main-content"`;
- login e certificado tinham o skip link, mas foram exportados antes que o `requestAnimationFrame` de `RouteAccessibility` preparasse o landmark principal.

O conteúdo visual estava correto e não havia exceção JavaScript, porém o snapshot não comprovava que a infraestrutura de navegação por teclado havia terminado de configurar a página.

## Implementação

A condição de prontidão do CDP passa a exigir, para cada rota da matriz pública:

1. `#root` com conteúdo final;
2. todos os fragmentos textuais contratados;
3. exatamente um elemento com `id="main-content"`;
4. esse elemento sendo `main` ou possuindo `role="main"`;
5. `tabindex="-1"` no alvo principal;
6. exatamente um link com `href="#main-content"`;
7. texto `Pular para o conteúdo principal` nesse link;
8. presença de uma live region `aria-live="polite"` e `aria-atomic="true"`.

O DOM só é exportado depois que todas essas condições forem verdadeiras. As mesmas propriedades são revalidadas após a espera para produzir mensagens de falha específicas por rota.

## Contrato permanente

O contrato B118/B122/B123 impede:

- remover os campos de acessibilidade da avaliação CDP;
- voltar a considerar apenas texto e raiz React como prontidão;
- aceitar zero ou múltiplos `#main-content`;
- remover skip link, tabindex ou live region;
- reduzir a matriz pública de oito rotas.

## Limites

Esta fase valida estrutura e prontidão de navegação, mas não substitui:

- auditoria completa com leitor de tela;
- navegação manual por teclado;
- análise de contraste;
- axe em todos os estados interativos;
- teste visual responsivo.

## Exclusões

- Nenhuma migration foi criada ou alterada.
- O Supabase remoto não foi modificado.
- A branch `main` não foi alterada.
- Nenhum formulário foi submetido.
- Nenhuma dependência ou lockfile foi alterado.

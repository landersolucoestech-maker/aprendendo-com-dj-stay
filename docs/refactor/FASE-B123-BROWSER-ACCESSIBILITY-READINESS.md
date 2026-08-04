# FASE B123 — Prontidão acessível dos artefatos do navegador

## Problema comprovado

A inspeção dos artefatos de gates verdes anteriores mostrou uma diferença temporal relevante:

- a home já possuía `id="main-content"`;
- login, certificado, contato, cadastro, recuperação, acesso negado e 404 tinham skip link e live region, mas não possuíam o landmark preparado no DOM final.

A causa foi reproduzida no ciclo de `Suspense`: o efeito de `RouteAccessibility` executava um `requestAnimationFrame` para preparar o `<main>` do fallback de carregamento. Quando o lazy chunk terminava, o fallback era substituído sem alteração de pathname. Como o efeito dependia apenas da rota, o novo `<main>` não recebia `id="main-content"` nem `tabindex="-1"`.

O conteúdo visual estava correto e não havia exceção JavaScript, porém a infraestrutura de navegação por teclado não sobrevivia à substituição assíncrona do nó.

## Implementação na aplicação

`RouteAccessibility` continua preferindo o `<main>` ou `[role="main"]` fornecido pela página. Quando nenhum landmark existe, o boundary estável permanece como fallback com `role="main"`.

Além da preparação inicial, o componente instala um `MutationObserver` no boundary com opções restritas a:

- `childList: true`;
- `subtree: true`.

Cada substituição de conteúdo reagenda a preparação no próximo frame. Assim, quando o `Suspense` remove o fallback e monta a página lazy, o alvo final recebe novamente:

- `id="main-content"`;
- `tabindex="-1"` quando necessário;
- papel principal somente quando a página não fornece landmark semântico.

O observer não observa atributos. Portanto, as alterações de `id`, `role`, `tabindex` e `data-*` produzidas pela própria reconciliação não disparam um ciclo. No cleanup, o observer é desconectado e qualquer frame pendente é cancelado.

## Prontidão no navegador

A condição de prontidão do CDP exige, para cada rota da matriz pública:

1. `#root` com conteúdo final;
2. todos os fragmentos textuais contratados;
3. exatamente um elemento com `id="main-content"`;
4. esse elemento sendo `main` ou possuindo `role="main"`;
5. `tabindex="-1"` no alvo principal;
6. exatamente um link com `href="#main-content"`;
7. texto `Pular para o conteúdo principal` nesse link;
8. presença de uma live region `aria-live="polite"` e `aria-atomic="true"`.

O DOM só é exportado depois que todas essas condições forem verdadeiras. As mesmas propriedades são revalidadas após a espera para produzir mensagens de falha específicas por rota.

## Evidência aprovada

O commit `63ebdfd043fc4a3ba02642c7b0f470e97be0611d` concluiu no mesmo snapshot:

- instalação limpa, lint e testes unitários;
- reconstrução local do Supabase e pgTAP;
- sincronização de tipos, contratos estáticos e TypeScript;
- build, entrega HTTP e Chrome headless;
- oito rotas públicas com conteúdo final e sem exceções JavaScript não tratadas.

A inspeção dos artefatos exportados confirmou, em cada uma das oito rotas:

- exatamente um `#main-content`;
- alvo principal representado por `<main>`;
- `tabindex="-1"`;
- exatamente um skip link;
- ao menos uma live region de navegação;
- zero eventos `Runtime.exceptionThrown`.

## Contrato permanente

Os contratos B118/B122/B123 impedem:

- remover a reconciliação após substituições do `Suspense`;
- observar atributos e criar loop com as próprias correções;
- deixar de desconectar o observer ou cancelar o frame;
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

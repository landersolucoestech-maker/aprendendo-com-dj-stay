# FASE B139 — verdade consolidada das interações públicas

## Problema comprovado

O runtime público evoluiu além da evidência consolidada em `docs/STATUS.md`. O status ainda tratava B132/B133 como a prova integral mais recente, embora o mesmo gate já comprovasse:

- navegação desktop pelo link real `Entrar`;
- menu móvel, link móvel e fechamento após a rota;
- foco inicial no menu, `Escape` confiável e retorno do foco ao botão;
- skip link alcançado e ativado por teclado real;
- preservação do foco lazy, anúncio e isolamento de rede durante toda a sequência.

Manter o status em uma evidência anterior faria a documentação operacional divergir do artefato efetivamente validado.

## Evidência integral atual

A fonte de verdade consolidada passa a ser:

- commit `c4e299b8f544dc07bd394f1ae287efb4ee53e2e9`;
- issue de evidência `#1074`;
- run `30957555483`;
- instalação, lint, 799 testes unitários, Supabase local, 1.878 testes pgTAP, tipos, contratos, TypeScript, build e navegador aprovados no mesmo snapshot.

O artifact funcional do B138 comprovou adicionalmente:

- primeiro `Tab` com evento confiável no skip link;
- skip link visível, conectado e com destino `#main-content`;
- `Enter` confiável gerando clique com `detail: 0`;
- `defaultPrevented === true`, hash inalterado e foco no `#main-content`;
- clique desktop `Entrar` com `isTrusted === true`;
- clique móvel no botão e no link com `isTrusted === true`;
- `Escape` móvel confiável, prevenido e com retorno do foco ao botão;
- exatamente um `Document` inicial por prova client-side e nenhum novo `Document` para `/login`;
- zero origem externa e zero resposta HTTP com status maior ou igual a 400.

## Correção documental

`docs/STATUS.md` e `docs/refactor/README.md` passam a distinguir claramente:

- matriz de carregamentos diretos;
- navegação desktop real;
- navegação móvel real;
- ciclo de foco por teclado do menu móvel;
- ativação real do skip link;
- limites de homologação externa e produção.

`scripts/check-current-gate-documentation.mjs` torna obrigatórios a evidência B139, os artifacts das interações e a declaração de que produção permanece sem promoção.

## Limites

- A validação pública não equivale a E2E autenticado completo.
- A validação pública não equivale a homologação financeira no sandbox Asaas.
- A validação pública não equivale a pentest independente.
- Supabase remoto não foi modificado.
- Nenhuma migration, dependência ou lockfile foi alterado.
- Produção e branch `main` permanecem sem promoção.

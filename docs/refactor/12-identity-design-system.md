# FASE B23 — Identidade e design system

## Decisão de identidade

A identidade existente de **Aprendendo com DJ Stay** foi preservada. Esta fase não cria uma nova marca e não altera nome, logotipo ou direção cromática aprovada no produto.

A configuração institucional passou a ter uma fonte de verdade em `src/config/brand.ts`, contendo nome, nome curto, caminho do logotipo e texto alternativo.

## Tokens semânticos

Os valores visuais foram consolidados em variáveis CSS e consumidos pelo Tailwind:

- marca: `brand-light`, `brand-medium` e `brand-dark`;
- superfícies: `background`, `card`, `surface-raised` e `surface-overlay`;
- conteúdo: `foreground`, `muted-foreground` e respectivos contrastes;
- interação: `primary`, `ring`, `border`, estados destrutivos e tokens da barra lateral;
- tipografia: Inter com fallback explícito para fontes de sistema.

Os antigos hexadecimais duplicados foram removidos do `tailwind.config.ts`. Gradientes e animações agora usam os mesmos tokens CSS da aplicação.

## Componentes e navegação

- criada a variante oficial `brand` no componente `Button`;
- preservada temporariamente a classe CSS `btn-neon` apenas como compatibilidade para superfícies ainda não migradas;
- proibido novo uso de `btn-neon` ou `btn-brand` nos componentes migrados;
- navegação desktop e mobile usam a mesma lista de itens;
- marca, logo e texto alternativo vêm de `brandConfig`;
- links com aparência de botão usam `Button asChild`;
- navegação usa tokens semânticos em vez de preto, branco e cinzas hardcoded;
- menu móvel expõe estado e relacionamento por `aria-expanded` e `aria-controls`.

## Superfícies migradas

- navegação global;
- tela de validação e redirecionamento de afiliados;
- variante de botão de marca;
- utilitários globais de gradiente, borda e cartão translúcido.

## Contrato de regressão

O script `scripts/check-design-system-contract.mjs` bloqueia:

- remoção ou bypass da configuração central de marca;
- retorno dos hexadecimais antigos ao Tailwind;
- logo e nome hardcoded na navegação;
- retorno de classes legadas nos componentes migrados;
- remoção da variante oficial de botão;
- abandono dos tokens semânticos nas superfícies já migradas.

## Limites da fase

Esta fase não executa redesign integral das páginas nem substitui a identidade visual existente. A migração das demais superfícies deve ocorrer sequencialmente, mantendo o contrato B23 e sem escrita fora da branch GitHub `dev`.

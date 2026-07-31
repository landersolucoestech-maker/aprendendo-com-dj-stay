# FASE B24 — Acessibilidade

## Objetivo

Estabelecer uma base transversal de acessibilidade para navegação, autenticação e fluxos públicos críticos, sem alterar regras de negócio, autorização, persistência ou contratos do Supabase.

## Navegação e foco

Foi criado o boundary `RouteAccessibility`, integrado ao roteamento principal.

A implementação:

- oferece o link de salto **Pular para o conteúdo principal**;
- identifica o `main` ou `role="main"` da rota atual;
- cria um landmark de fallback somente quando a página não possui um;
- direciona o foco ao conteúdo principal após mudança de rota;
- anuncia a conclusão da navegação por região `aria-live="polite"`;
- remove atributos temporários quando o alvo muda;
- evita landmarks principais aninhados.

A Home passou a declarar explicitamente seu `main`, separado do cabeçalho e do rodapé.

## Teclado

A navegação móvel passou a:

- mover o foco para o primeiro controle quando aberta;
- fechar com a tecla `Escape`;
- devolver o foco ao botão que abriu o menu;
- expor o estado com `aria-expanded` e o relacionamento com `aria-controls`;
- manter a mesma lista de destinos nas versões desktop e móvel.

## Movimento reduzido

A aplicação respeita `prefers-reduced-motion: reduce`:

- rolagem suave é substituída por rolagem imediata;
- animações são reduzidas a uma única iteração mínima;
- transições são reduzidas;
- indicadores de carregamento continuam acompanhados de texto e regiões de status.

## Foco e contraste

- controles interativos recebem contorno global visível baseado no token `ring`;
- a variante oficial `brand` usa `primary-foreground` sobre o gradiente ciano;
- a compatibilidade legada `.btn-brand` e `.btn-neon` recebeu o mesmo contraste;
- superfícies migradas usam tokens semânticos em vez de preto, branco e cinzas hardcoded.

## Formulários públicos

Foram migrados:

- login;
- cadastro;
- recuperação de senha;
- redefinição de senha;
- contato;
- validação pública de certificado.

As garantias incluem:

- `Label` associado ao campo;
- `autocomplete` e `inputmode` adequados;
- instruções conectadas por `aria-describedby`;
- estados inválidos por `aria-invalid`;
- erros persistentes com `role="alert"`;
- sucessos e resultados com `role="status"` e `aria-live`;
- formulários e consultas com `aria-busy` durante operações assíncronas;
- toggles de senha com nome acessível e `aria-pressed`;
- ícones decorativos removidos da árvore de acessibilidade;
- submit com texto explícito durante carregamento.

## Estados públicos e de autorização

Também foram migrados:

- confirmação de email;
- email confirmado;
- carregamento de sessão;
- acesso negado;
- rota inexistente;
- redirecionamento de afiliado.

Links com aparência de botão usam `Button asChild`. A fase remove controles interativos aninhados, preservando semântica, foco e ativação por teclado.

## Contrato de regressão

O script `scripts/check-accessibility-contract.mjs` bloqueia:

- remoção do link de salto ou do foco por rota;
- ausência de reduced motion;
- perda do contraste da variante de marca;
- regressão do menu móvel em foco, `Escape` ou ARIA;
- retorno de classes visuais legadas nas páginas migradas;
- remoção de estados `alert`, `status` ou `busy` dos fluxos críticos;
- retorno de `Button` aninhado dentro de `Link`.

## Limites e continuidade

Esta fase estabelece a infraestrutura e migra as superfícies públicas críticas. Componentes administrativos e domínios autenticados permanecem protegidos pelos componentes base e deverão receber testes automatizados de acessibilidade na FASE B29.

Nenhuma alteração foi feita fora da branch GitHub `dev`. O banco e as funções do Supabase não foram modificados nesta fase.

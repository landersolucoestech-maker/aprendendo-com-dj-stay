# FASE B122 — Matriz de rotas públicas no navegador

## Problema comprovado

O B118 valida execução real do JavaScript, commit do React e conteúdo final em três rotas públicas: home, login e certificado. O roteador também expõe outras superfícies anônimas estáveis que carregam chunks próprios e não dependem de sessão autenticada, callback OAuth ou integração financeira.

Sem cobertura no navegador, regressões em lazy imports, guards públicos, formulários e fallback 404 dessas páginas poderiam passar por lint, TypeScript e build.

## Implementação

A matriz do Chrome headless passa a executar sequencialmente:

- `/` — home;
- `/login` — autenticação;
- `/certificado` — validação pública;
- `/contato` — solicitação de contato;
- `/matricule-se` — cadastro;
- `/esqueceu-senha` — recuperação de senha;
- `/acesso-negado` — estado público de autorização;
- `/rota-inexistente-b122` — fallback 404.

Cada rota possui dois fragmentos estáveis de conteúdo final. O CDP aguarda simultaneamente:

1. `#root` renderizado;
2. todos os fragmentos contratados presentes;
3. ausência de exceção JavaScript não tratada;
4. ausência do Route Error Boundary e de artefatos herdados.

Cada target continua isolado e é fechado antes da próxima rota. O teste não submete formulários, não cria usuários, não envia contatos e não chama callbacks externos.

## Contrato permanente

O contrato B118/B122 exige que as oito rotas e seus fragmentos permaneçam na matriz. A remoção de qualquer superfície, o retorno para apenas três rotas ou a aceitação de fallback transitório bloqueia o typecheck.

## Limites

A matriz não substitui:

- E2E autenticado;
- submissão real dos formulários;
- teste de e-mail;
- validação do provider financeiro;
- teste visual por pixels;
- teste em múltiplos navegadores.

## Exclusões

- Nenhuma migration foi criada ou alterada.
- O Supabase remoto não foi modificado.
- A branch `main` não foi alterada.
- Nenhum usuário, contato ou pedido foi criado.
- Nenhuma dependência ou lockfile foi alterado.

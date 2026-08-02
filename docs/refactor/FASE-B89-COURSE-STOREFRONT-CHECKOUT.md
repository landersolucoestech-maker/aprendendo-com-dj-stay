# Fase B89 — vitrine autenticada e checkout de cursos

## Problema comprovado

O backend já aceitava `course` como sujeito de checkout, calculava o preço no servidor, criava a ordem de pagamento e concedia a matrícula após confirmação do provider. Entretanto, nenhuma tela do frontend iniciava esse fluxo.

Antes desta fase:

- produtos digitais possuíam compra real com Pix ou cartão;
- cursos publicados apareciam na home, mas o CTA levava apenas ao cadastro;
- o UUID exigido pelo contrato de checkout não era disponibilizado por uma fronteira autenticada;
- não existia tratamento visual para matrícula já ativa;
- um afiliado podia acessar o marketplace de produtos, mas não deveria comprar um curso que seu papel não consegue consumir.

## Resolução autenticada por slug

A migration `20260802230000_course_checkout_resolution.sql` criou:

- `private.resolve_course_checkout_subject(text)`;
- `public.resolve_course_checkout_subject(text)`.

O catálogo anônimo continua sem expor `course_id`. O UUID do curso é resolvido somente após sessão válida e somente para os papéis `aluno` e `administrador_proprietario`.

A resolução valida novamente:

- formato canônico do slug;
- status publicado;
- ausência de exclusão lógica;
- preço positivo em BRL;
- janela de disponibilidade;
- regra de liberação do curso.

Quando existe matrícula ativa, a função retorna `course_id = null`, `already_enrolled = true` e `checkout_eligible = false`. Assim, a interface não cria um novo checkout acidental.

`anon` não recebe permissão de execução e nenhuma permissão direta de tabela foi adicionada.

## Serviço de checkout compartilhado

A lógica já existente em `useHostedCheckout` foi extraída para `createHostedCheckout` sem modificar o comportamento dos produtos digitais.

O fluxo de curso reutiliza integralmente:

- contrato estrito de checkout;
- preparação de intenção com atribuição de afiliado;
- chave idempotente persistida na sessão;
- Edge Function `create-asaas-checkout`;
- validação da resposta hospedada.

Para cursos, o payload utiliza:

- `subjectType: "course"`;
- UUID resolvido pelo servidor;
- `licenseId: null`.

## Vitrine autenticada

A rota protegida `/cursos` foi criada para aluno e proprietário. Ela:

- lista somente cursos retornados pelo catálogo publicado;
- destaca o slug solicitado pela home;
- apresenta preço, promoção, currículo, duração e certificado persistidos;
- inicia o checkout hospedado;
- redireciona para a URL HTTPS retornada pelo provider;
- informa matrícula ativa e direciona para `/aluno/cursos` sem criar nova compra;
- apresenta estados de carregamento, erro, catálogo vazio e curso solicitado indisponível.

O `RequireAuth` já preserva pathname, query string e hash. Portanto, um visitante que acessa `/cursos?curso=<slug>` é enviado ao login e retorna ao mesmo curso depois da autenticação.

## Segurança e papéis

- aluno: pode resolver e comprar cursos;
- proprietário: pode usar a mesma vitrine para validar o fluxo;
- afiliado: não pode resolver um curso, pois o papel não possui acesso ao portal acadêmico;
- anônimo: visualiza apenas o catálogo comercial sem UUID e não executa a resolução de checkout.

O backend continua sendo a autoridade final para preço, disponibilidade, idempotência, criação da ordem e concessão da matrícula.

## Contratos e testes

- `58_course_checkout_resolution.test.sql` cobre grants, sessão, papel, disponibilidade e matrícula ativa;
- `course-checkout.test.ts` cobre os estados estritos de resolução e resultado;
- `check-course-storefront.mjs` vincula migration, hook, serviço compartilhado, rota, CTA e documentação;
- `check:course-storefront` participa do `typecheck` bloqueante.

## Ambiente

A fase foi implementada exclusivamente na branch `dev`. A branch `main`, o projeto Supabase de produção e as credenciais externas do Asaas permanecem sem alterações.

A presença do botão e a aprovação dos testes não substituem a homologação financeira no sandbox do provider.

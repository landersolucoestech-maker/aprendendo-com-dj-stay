# FASE B127 — Isolamento do catálogo no runtime sintético

## Problema comprovado

O build de qualidade B119 utiliza uma chave sintética que não autentica no Supabase. A home pública ainda executava `get_public_course_catalog` contra o projeto remoto durante o smoke no Chrome, produzindo resposta HTTP `401` e permitindo que o snapshot fosse coletado enquanto o catálogo permanecia em estado de carregamento.

Essa chamada não validava a integração real, porque o token é deliberadamente inválido, e introduzia rede externa não determinística no gate.

## Implementação

A configuração pública deriva `ciRuntimeSmokeEnabled` exclusivamente da combinação já validada entre:

- `VITE_CI_RUNTIME_SMOKE=true`;
- ambiente `development`;
- marcador sintético canônico não credencial.

O shape público existente da configuração foi preservado.

O catálogo sintético está em `src/runtime/ci-runtime-smoke-catalog.ts`. A fixture:

- contém somente um curso explicitamente técnico;
- não representa oferta comercial persistida;
- satisfaz `PublicCourseCatalog` em TypeScript;
- passa pelo mesmo `publicCourseCatalogSchema` usado pela RPC real;
- mantém totais de módulos, aulas, duração e prévias coerentes.

`loadPublicCourseCatalog` recebe a flag de runtime e a função RPC. Quando a flag está ativa, retorna a fixture validada antes de executar a RPC. Fora desse modo, continua exigindo `get_public_course_catalog` e valida o payload persistido normalmente.

## Provas automatizadas

Os testes unitários exigem que:

- a fixture satisfaça o schema público;
- os totais derivados permaneçam coerentes;
- a RPC receba zero chamadas no modo sintético;
- a RPC seja chamada exatamente uma vez fora do modo sintético.

O smoke CDP da home exige o conteúdo final:

- `Curso de validação do runtime`;
- `Investimento atual`.

Ele rejeita:

- `Carregando catálogo`;
- `Carregando conteúdo publicado`;
- `Catálogo temporariamente indisponível`.

O domínio `Network` do Chrome DevTools Protocol registra requisições e respostas em `<rota>.network.json`. O gate falha quando:

- qualquer requisição aponta para `*.supabase.co`;
- qualquer resposta HTTP possui status igual ou superior a 400.

## Limites

A fixture comprova somente renderização, contrato de dados e isolamento do artefato sintético. Ela não substitui:

- a RPC PostgreSQL e seus testes pgTAP;
- o ambiente local com chave publishable ativa;
- homologação remota do catálogo;
- testes autenticados ou de pagamento.

## Exclusões

- Nenhuma migration foi criada ou alterada.
- O Supabase remoto não foi modificado.
- A branch `main` não foi alterada.
- Nenhuma chave ativa foi versionada.
- Nenhuma dependência ou lockfile foi alterado.

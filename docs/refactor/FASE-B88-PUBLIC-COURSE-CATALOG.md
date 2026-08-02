# Fase B88 — catálogo público e verdade comercial

## Objetivo

Substituir a vitrine pública herdada, composta por cursos, módulos, preços, métricas, depoimentos e vídeos escritos diretamente no frontend, por uma superfície derivada do estado persistido e verificável da plataforma.

Antes desta fase, a home continha:

- título e descrição fixos de um único curso;
- seis módulos, quantidade de aulas, duração e preço definidos em arrays TypeScript;
- números de alunos, avaliações, samples, streams, hits, rankings e parceiros sem fonte operacional;
- depoimentos atribuídos a terceiros sem registro persistido;
- botões de prévia e depoimento que não reproduziam conteúdo real;
- promessas de comunidade, suporte direto e reconhecimento de certificado não condicionadas ao cadastro efetivo do curso.

## Read model público

A migration `20260802213000_public_course_catalog.sql` criou `private.get_public_course_catalog()` e o wrapper `public.get_public_course_catalog()`.

A função privada usa `SECURITY DEFINER` e `search_path` vazio para montar um payload explícito. O wrapper público permanece `SECURITY INVOKER`. `anon` e `authenticated` recebem apenas permissão de execução; não recebem `SELECT` direto em `courses`, `modulos` ou `aulas`.

Entram no catálogo somente cursos que:

- estejam com status `published`;
- não estejam excluídos;
- possuam descrição curta, descrição completa, categoria e objetivos;
- estejam dentro da janela de disponibilidade;
- estejam liberados conforme o modo de publicação.

Módulos e aulas participam dos totais somente quando estão publicados e não excluídos.

## Payload permitido

O read model público expõe somente dados necessários para a decisão comercial:

- slug, título, descrições, categoria, idioma e nível;
- objetivos e pré-requisitos;
- preço normal, preço efetivo e estado da promoção;
- prazo de acesso e configuração de certificado;
- data de publicação;
- quantidade de módulos, aulas, duração e prévias;
- títulos, descrições e totais dos módulos publicados.

Não são expostos:

- IDs de assets privados;
- URLs de arquivos ou mídia;
- conteúdo textual integral das aulas;
- IDs de usuários;
- versão editorial;
- campos de auditoria ou administração.

## Frontend

`usePublicCourseCatalog` consulta exclusivamente a RPC e valida o retorno com `publicCourseCatalogSchema`.

A home passou a utilizar o mesmo read model no hero e no catálogo:

- o curso em destaque é o curso publicado mais recente retornado pela RPC;
- preço promocional aparece somente quando a promoção está ativa;
- módulos, aulas, duração e prévias são derivados do currículo publicado;
- estados de carregamento, erro e catálogo vazio não inventam uma oferta substituta;
- nenhum acesso direto às tabelas do domínio foi adicionado ao frontend público.

## Remoção de alegações sem fonte

Foram removidos:

- `TestimonialsSection.tsx`;
- `VideoTestimonialModal.tsx`;
- depoimentos e citações atribuídos a pessoas reais;
- números de alunos, avaliações, streams, hits, parceiros e rankings;
- preços parcelados e quantidades de materiais fixadas no código;
- promessa de vídeo ou prévia inexistente;
- alegação de certificado reconhecido no mercado.

A seção substituta `OperationalTrustSection` descreve somente capacidades já implementadas: progresso persistido, suporte com protocolo, certificado verificável e controle de acesso.

## Contratos e testes

- `57_public_course_catalog.test.sql` valida autorização anônima, filtros de publicação, totais derivados e ausência de identificadores privados;
- `public-course-catalog.test.ts` valida o payload estrito, preços e invariantes entre curso e módulos;
- `check-public-course-catalog.mjs` bloqueia o retorno de conteúdo fictício e garante a ligação entre banco, contrato, hook e home;
- `check:public-course-catalog` participa do `typecheck` bloqueante.

## Escopo e ambiente

A fase adiciona uma migration e um read model público, mas não altera dados remotos, credenciais, provider financeiro, Edge Functions ou configuração externa.

A execução ocorre exclusivamente na branch `dev`. A branch `main` e o Supabase de produção permanecem sem alterações.

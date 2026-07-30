# FASE B8 — Papéis, autorização e RLS

Status: migration e testes negativos preparados; encerramento condicionado à reconstrução limpa, tipos gerados e validação no Supabase `dev`.

## Papéis permitidos

O sistema reconhece exclusivamente:

- `aluno`;
- `afiliado`;
- `administrador_proprietario`.

A autorização não utiliza `user_metadata`. O papel é persistido em `public.user_roles`, protegido por RLS e atribuído como `aluno` por trigger após a criação de um usuário no Supabase Auth.

## Regras implementadas no domínio existente

- aluno permanente lê módulos, aulas e metadados de materiais;
- aluno gerencia somente o próprio progresso e perfil;
- afiliado não acessa conteúdo ou progresso do portal do aluno;
- afiliado gerencia somente o próprio perfil;
- administrador proprietário possui acesso administrativo integral às tabelas existentes;
- nenhum usuário comum pode elevar o próprio papel;
- usuário anônimo autenticado não recebe autorização de aplicação;
- `anon` não recebe grants nas tabelas de aplicação.

Entidades de pedidos, pagamentos, produtos, downloads autorizados, matrículas, avaliações, certificados, links, cliques, conversões, comissões e repasses ainda não existem e serão protegidas nas fases em que forem modeladas.

## Segurança das funções

As únicas funções `SECURITY DEFINER` desta fase ficam no schema privado não exposto:

- `private.current_user_role()`;
- `private.handle_new_user_role()`.

Ambas usam `search_path` vazio e referências totalmente qualificadas. A função de trigger não pode ser executada por `anon` ou `authenticated`.

## Segurança por padrão

A migration revoga privilégios automáticos futuros no schema `public`. Novas tabelas, funções e sequências deverão declarar grants explicitamente na mesma migration em que forem criadas.

## Testes

A suíte pgTAP valida casos positivos e negativos para aluno, afiliado, administrador proprietário e usuário anônimo autenticado, incluindo isolamento entre usuários, tentativa de autoelevação, escrita indevida de conteúdo e auditoria de `SECURITY DEFINER`.

## Limites

- autorização por matrícula e compra será adicionada na FASE B10;
- Storage privado será tratado na FASE B9;
- papéis futuros não podem ser adicionados sem alteração explícita deste contrato;
- produção permanece somente leitura.

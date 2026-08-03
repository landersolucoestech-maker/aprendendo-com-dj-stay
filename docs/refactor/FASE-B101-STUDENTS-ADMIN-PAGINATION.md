# FASE B101 — Paginação da administração acadêmica

## Objetivo

Eliminar o read model parcialmente paginado que limitava a busca de alunos ao primeiro lote e, ao mesmo tempo, serializava todas as matrículas e todos os certificados em uma única resposta administrativa.

A FASE B101 adiciona paginação no servidor, totais filtrados e ordenação determinística para as três coleções acadêmicas operacionais:

- alunos;
- matrículas;
- certificados.

## Read model

A migration `20260803050000_students_admin_pagination.sql` substitui a assinatura antiga de `get_students_admin_dashboard(...)` por parâmetros independentes:

- `p_student_limit` e `p_student_offset`;
- `p_enrollment_limit` e `p_enrollment_offset`;
- `p_certificate_limit` e `p_certificate_offset`.

Cada limite é normalizado entre 1 e 100 registros. Cada offset negativo é convertido para zero.

O payload retorna:

- `totals.students`;
- `totals.enrollments`;
- `totals.certificates`;
- `totals.valid_certificates`;
- página de alunos;
- catálogo completo de cursos;
- página de matrículas;
- página de certificados.

O catálogo de cursos permanece completo porque é necessário para a concessão manual de matrícula e não depende da pesquisa do titular.

## Filtro compartilhado

A busca por nome ou e-mail é aplicada antes do total e da paginação nas três coleções. Assim, ao pesquisar um titular, a interface recebe somente:

- o aluno correspondente;
- as matrículas desse titular;
- os certificados desse titular.

A busca é case-insensitive e não altera o catálogo de cursos.

## Ordenação determinística

Para impedir sobreposição ou salto instável entre páginas:

- alunos: `created_at desc, id desc`;
- matrículas: `created_at desc, id desc`;
- certificados: `issued_at desc, id desc`.

## Interface administrativa

A rota `/admin/alunos` utiliza páginas independentes de 25 registros:

- paginação de alunos junto ao formulário de concessão;
- paginação de matrículas;
- paginação do histórico de certificados.

Alterar a busca retorna as três coleções à primeira página. O aluno selecionado no formulário também é limpo quando a página de alunos muda.

Os controles Anterior e Próxima ficam indisponíveis durante atualização da consulta ou quando a coleção já está no primeiro ou último lote.

## Dashboard do proprietário

O dashboard geral solicita apenas uma amostra mínima de cada coleção acadêmica, mas exibe os totais persistidos do read model. Ele não utiliza tamanho da página para afirmar quantidade global, status de matrícula ou média de conclusão.

Métricas de progresso e atividade permanecem sob responsabilidade do read model analítico B97, que possui coorte e semântica próprias.

## Segurança

- somente `administrador_proprietario` pode consultar o read model;
- `anon` não possui `EXECUTE` na função pública;
- o wrapper público permanece `SECURITY INVOKER`;
- a função privada permanece `SECURITY DEFINER` com `search_path` vazio;
- tabelas de usuários, matrículas e certificados não são expostas diretamente ao frontend;
- concessão, suspensão, renovação, revogação e emissão continuam executadas pelas RPCs transacionais existentes.

## Cobertura

A suíte pgTAP B101 possui 34 asserções e valida:

- remoção da assinatura parcialmente paginada;
- segurança das funções privada e pública;
- bloqueio de aluno e papel anônimo;
- totais completos e certificados válidos;
- páginas independentes sem sobreposição;
- filtro compartilhado por nome e e-mail;
- busca sem resultados;
- catálogo de cursos independente da busca;
- normalização de limites e offsets;
- ordenação determinística;
- totais independentes das páginas.

O contrato TypeScript rejeita totais negativos, certificados válidos acima do total, páginas maiores que o total filtrado e campos extras.

## Escopo de ambiente

A implementação foi versionada exclusivamente na branch `dev`. Nenhuma migration B101 foi aplicada ao Supabase remoto e nenhuma alteração foi feita em `main` ou produção.

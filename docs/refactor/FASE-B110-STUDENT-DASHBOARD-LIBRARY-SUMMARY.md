# FASE B110 — Total exato da biblioteca no dashboard do aluno

## Problema

A página completa da biblioteca foi paginada na B109, mas o dashboard ainda usava `useStudentLibrary()` e apresentava `library.length` como se fosse o total global. Essa consulta transferia todos os assets retornados pelo PostgREST apenas para contar registros e poderia transformar o limite de resposta do serviço em uma métrica incorreta.

## Implementação

- contrato estrito `studentLibrarySummarySchema` com total inteiro e não negativo;
- hook `useStudentLibrarySummary()`;
- consulta à tabela `assets` com `count: "exact"` e `head: true`;
- mesmos filtros de estado, exclusão lógica e finalidades materiais usados pela biblioteca do aluno;
- nenhuma filtragem por `owner_user_id`, preservando grants autorizados pela RLS;
- novo `StudentDashboardPage` roteado antes do componente legado;
- card “Materiais liberados” alimentado por `librarySummaryQuery.data.total`;
- cursos e atividades continuam apresentados como amostras deliberadamente limitadas e identificadas como recentes.

## Segurança

A consulta permanece sob a sessão autenticada e as políticas RLS de `assets`. Nenhum asset, caminho de storage ou URL assinada é transferido pela consulta de resumo.

## Escopo

Nenhuma migration foi necessária. A alteração é exclusiva da branch `dev`; `main`, produção e Supabase remoto não foram modificados.

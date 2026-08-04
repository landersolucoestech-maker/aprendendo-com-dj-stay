# FASE B111 — Resumo agregado do progresso do aluno

## Problema

O dashboard do aluno usava `useUserProgress()` e transferia todas as linhas de `progresso_aulas` apenas para calcular média de progresso e quantidade de aulas concluídas. Além do custo crescente, o limite padrão do PostgREST poderia transformar uma página parcial em métrica global.

## Implementação

A RPC `public.get_student_progress_summary()` retorna somente:

- `started_lessons`;
- `completed_lessons`;
- `average_progress_percent`.

A média é calculada e arredondada no PostgreSQL. O dashboard consome o contrato estrito `studentProgressSummarySchema` pelo hook `useStudentProgressSummary()` e não carrega mais linhas de progresso para montar os cards.

## Segurança

- função pública `SECURITY INVOKER`;
- `search_path` vazio;
- execução negada para `anon` e concedida somente a `authenticated`;
- identidade obtida por `auth.uid()`;
- filtro explícito por `progress_record.user_id = auth.uid()`;
- nenhum detalhe de aula ou evento é exposto pelo resumo.

## Testes

A suíte pgTAP possui 13 asserções cobrindo metadados, privilégios, autenticação, agregação, arredondamento, isolamento entre contas e resposta vazia coerente.

## Supabase remoto

A migration B111 foi aplicada exclusivamente ao projeto preview da branch `dev` (`jmtyurketfclaneqxohu`). A função remota foi validada como estável, `SECURITY INVOKER`, sem permissão de execução para `anon` e com execução concedida a `authenticated`.

A branch `main` do GitHub e o projeto Supabase principal permanecem sem alterações.

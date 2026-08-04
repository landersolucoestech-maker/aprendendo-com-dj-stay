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

## Escopo

A migration, o contrato, o hook e o dashboard foram alterados exclusivamente na branch `dev`. Supabase remoto, `main` e produção permanecem sem alterações.

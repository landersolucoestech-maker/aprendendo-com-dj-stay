# FASE B112 — Acesso paginado aos cursos do aluno

## Problema

O portal do aluno não possuía uma página própria para consultar o histórico completo de matrículas. O dashboard exibia somente uma amostra de cursos ativos e qualquer tentativa de reaproveitar essa amostra para o histórico produziria paginação incorreta, perda de registros e divergência entre o estado calculado no navegador e o estado válido no servidor.

## Implementação

A RPC `public.get_student_course_access(p_limit, p_offset, p_active_limit)` retorna um read model único com:

- `total`: quantidade total de matrículas do aluno autenticado;
- `active_total`: quantidade de matrículas cujo acesso está ativo no relógio do banco;
- `active_enrollments`: amostra limitada dos acessos ativos para o dashboard;
- `enrollments`: página do histórico, com `access_active` calculado pelo PostgreSQL para cada matrícula.

A função limita `p_limit` entre 1 e 100, `p_active_limit` entre 1 e 10 e normaliza `p_offset` para zero ou mais. A ordenação usa `created_at desc, id desc`, garantindo paginação determinística.

O hook `useStudentCourseAccess()` valida a resposta por meio de `studentCourseAccessSchema`. A rota `courses` do portal passou a renderizar `StudentCoursesPage`, que apresenta estados de carregamento, erro e vazio, histórico paginado e acesso ao conteúdo somente quando `access_active` é verdadeiro.

## Tipagem

O cliente Supabase utiliza o contrato efetivo definido em `src/integrations/supabase/database.ts`. Esse tipo estende a base gerada com as RPCs B111 e B112, preservando argumentos e retorno `Json` sem `any`, casts ou supressões de TypeScript.

## Segurança

- função pública `SECURITY INVOKER`;
- `search_path` vazio;
- execução negada para `public` e `anon`;
- execução concedida somente a `authenticated`;
- identidade obtida por `auth.uid()`;
- filtro explícito por `enrollment_record.user_id = auth.uid()`;
- estado ativo calculado com `current_timestamp` no banco;
- somente campos mínimos do curso são expostos pelo read model.

## Testes

A suíte pgTAP possui 17 asserções cobrindo existência, metadados, privilégios, autenticação, isolamento por usuário, totais independentes da página, amostra ativa, validade temporal, curso publicado, paginação determinística, normalização dos limites e superfície mínima do read model.

Os testes unitários do contrato Zod cobrem payload válido, totais incoerentes, amostra ativa excessiva, página excessiva, `access_active` obrigatório e rejeição de campos extras.

## Supabase remoto

As migrations B111 e B112 foram aplicadas exclusivamente ao projeto preview da branch `dev` (`jmtyurketfclaneqxohu`). O advisor de segurança permaneceu sem alertas. A chamada autenticada em base vazia retornou `total = 0`, `active_total = 0` e listas vazias coerentes.

A branch `main` do GitHub e o projeto Supabase principal não foram alterados.

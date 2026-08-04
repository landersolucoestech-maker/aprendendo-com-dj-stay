# FASE B113 — Detalhe direcionado do curso e remoção do monólito do portal

## Problema

A rota de detalhe do curso ainda carregava todas as matrículas do aluno por `useCourseAccess()` e decidia no navegador, por meio de `Date.now()`, se o acesso estava ativo. Esse desenho transferia dados desnecessários, permitia divergência entre o relógio do cliente e o PostgreSQL e mantinha `StudentPortal.tsx` como um monólito com implementações duplicadas de dashboard, cursos, biblioteca, financeiro e histórico.

## Implementação

A RPC `public.get_student_course_detail_access(p_course_id)` retorna somente a projeção mínima da matrícula ativa do curso solicitado. Quando o usuário não possui acesso válido, o retorno é `null`.

A validação considera no banco:

- usuário obtido por `auth.uid()`;
- curso solicitado por UUID;
- matrícula com estado `active`;
- curso com estado `published`;
- início menor ou igual a `current_timestamp`;
- expiração ausente ou posterior a `current_timestamp`.

O hook `useStudentCourseDetailAccess()` valida o UUID antes da chamada, executa somente a RPC direcionada e valida o retorno pelo contrato `studentCourseDetailAccessSchema`.

A rota de curso passou a renderizar `StudentCoursePage`. O perfil passou a renderizar `StudentProfilePage`. Ambas usam `StudentPortalPageFrame`, preservando shell, sessão e logout.

`StudentPortalRouter` agora cobre explicitamente as oito seções do portal. O arquivo legado `src/pages/student/StudentPortal.tsx` foi removido integralmente, eliminando implementações duplicadas e hooks obsoletos do bundle.

## Segurança

- função `SECURITY INVOKER`;
- `search_path` vazio;
- execução negada para `public` e `anon`;
- execução concedida somente a `authenticated`;
- filtro explícito por `enrollment_record.user_id = auth.uid()`;
- nenhuma decisão temporal no navegador;
- retorno restrito à matrícula solicitada e ao resumo mínimo do curso.

## Testes

A suíte pgTAP possui 17 asserções cobrindo existência, metadados, privilégios, autenticação, UUID obrigatório, matrícula ativa, expiração, curso arquivado, isolamento entre alunos, curso inexistente, superfície do JSON, relógio do banco e filtro do usuário autenticado.

O contrato Zod possui cinco testes unitários cobrindo ausência de acesso, payload válido, matrícula revogada, curso arquivado e campo extra.

O gate estrutural B113 impede regressões para `useCourseAccess`, `getActiveEnrollments`, `Date.now()`, `new Date()` ou recriação do monólito removido.

## Supabase remoto

A migration B113 foi aplicada exclusivamente ao projeto preview da branch `dev` (`jmtyurketfclaneqxohu`). A função remota foi validada como estável, `SECURITY INVOKER`, inacessível a `anon` e executável por `authenticated`.

A branch `main` do GitHub e o projeto Supabase principal não foram alterados.

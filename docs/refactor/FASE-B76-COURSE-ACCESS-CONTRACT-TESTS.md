# Fase B76 — contratos de matrícula e acesso

## Objetivo

Alinhar os contratos TypeScript/Zod de matrícula aos constraints PostgreSQL e aos read models realmente consumidos pelo portal do aluno.

A fase cobre curso resumido, matrícula, registro completo, eventos auditáveis, o filtro puro de acesso ativo e os consumidores atuais `useStudentCourseAccess` e `useStudentCourseDetailAccess`.

## Curso resumido

`courseSummarySchema` valida:

- UUID;
- título entre 1 e 200 caracteres;
- slug entre 1 e 160 caracteres no formato persistido;
- status `draft`, `published` ou `archived`;
- rejeição de campos extras.

## Matrícula canônica

`enrollmentWithCourseSchema` reproduz:

- UUIDs do registro, usuário e curso;
- status e origem canônicos;
- referência entre 8 e 200 caracteres quando presente;
- motivo de status entre 1 e 500 caracteres quando presente;
- timestamps com offset;
- expiração posterior ao início;
- compra sempre com referência;
- compra ativa sempre com confirmação de pagamento;
- matrícula manual nunca pendente;
- curso resumido estrito.

## Registro completo

`enrollmentRowSchema` adiciona os campos persistidos não expostos nos read models resumidos:

- concedente manual;
- timestamps de suspensão e revogação;
- criação e atualização.

A coerência do registro completo reproduz as RPCs:

- matrícula manual exige concedente e não carrega referência ou pagamento;
- matrícula de compra não possui concedente manual;
- estados `pending` e `active` não possuem timestamps finais;
- `suspended` exige timestamp e motivo;
- `revoked` exige timestamp e motivo, sem timestamp residual de suspensão.

## Eventos

`enrollmentEventTypeSchema` e `enrollmentEventSchema` cobrem os eventos persistidos:

- criação;
- confirmação de pagamento;
- ativação;
- renovação;
- suspensão;
- revogação;
- acesso negado.

O schema valida matrícula, ator opcional, estados anterior/posterior opcionais, objeto JSON de detalhes, timestamp e rejeição de campos extras.

## Filtro puro de acesso ativo

`getActiveEnrollments` permanece como regra pura e determinística para os contratos e exige simultaneamente:

- matrícula `active`;
- curso `published`;
- `starts_at` menor ou igual ao instante informado;
- `expires_at` nulo ou estritamente posterior ao instante informado.

A suíte usa relógio falso para provar que o início é inclusivo e a expiração é exclusiva. Esse filtro não inicializa o cliente Supabase.

## Consumidores atuais

O portal não consulta mais a tabela `enrollments` diretamente pelo navegador.

`useStudentCourseAccess`:

- chama `get_student_course_access`;
- envia limite, offset e limite da amostra ativa normalizados;
- valida o retorno com `studentCourseAccessSchema`;
- recebe total geral, total ativo, amostra ativa e página de matrículas;
- mantém o resultado anterior durante a troca de página.

`useStudentCourseDetailAccess`:

- valida o UUID do curso;
- chama `get_student_course_detail_access`;
- valida o retorno com `studentCourseDetailAccessSchema`;
- entrega somente o recorte direcionado ao curso solicitado e ao usuário autenticado.

O hook legado `useCourseAccess` foi removido. Ele não pode ser restaurado porque duplicava no cliente uma consulta que hoje pertence aos read models do servidor.

## Testes

`src/contracts/course-access.test.ts` cobre:

- curso resumido;
- compra ativa e compra pendente;
- matrícula manual;
- referência, pagamento e janela;
- limites de motivo e referência;
- registro completo por origem;
- suspensão e revogação;
- eventos auditáveis;
- filtro de acesso ativo com início, expiração, status e publicação;
- UUIDs, timestamps e campos extras.

As suítes de limites e filtro puro preservam a independência do cliente Supabase. `scripts/check-course-access-contract-tests.mjs` vincula contratos, testes, read models, hooks atuais, migrations, RPCs, documentação e `package.json`, além de bloquear o retorno do hook legado.

## Exclusões deliberadas

A janela relativa do instante atual continua sendo avaliada em `getActiveEnrollments` e em `private.has_active_course_access`; o schema valida apenas relações temporais determinísticas entre os campos persistidos.

Nenhuma migration foi criada ou alterada.

Nenhuma RPC, policy, grant, dado ou configuração do Supabase remoto foi alterado.

A branch `main` não foi modificada. Todo o trabalho permaneceu na branch `dev`.

## Validação esperada

A fase somente pode ser encerrada após o mesmo snapshot aprovar:

- instalação limpa;
- lint;
- testes unitários;
- Supabase CLI;
- banco local e pgTAP;
- geração de tipos;
- TypeScript;
- build;
- navegador.

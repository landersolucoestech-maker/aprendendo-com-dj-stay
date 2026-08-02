# Fase B76 — contratos de matrícula e acesso

## Objetivo

Alinhar os contratos TypeScript/Zod de matrícula aos constraints PostgreSQL e ao recorte realmente consumido por `useCourseAccess`.

A fase cobre curso resumido, matrícula do aluno, registro completo, eventos auditáveis e o filtro local de acesso atualmente válido.

## Curso resumido

`courseSummarySchema` valida:

- UUID;
- título entre 1 e 200 caracteres;
- slug entre 1 e 160 caracteres no formato persistido;
- status `draft`, `published` ou `archived`;
- rejeição de campos extras.

## Matrícula consumida pelo portal

`enrollmentWithCourseSchema` preserva exatamente o recorte selecionado por `useCourseAccess` e reproduz:

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

`enrollmentRowSchema` adiciona os campos persistidos não selecionados pelo portal:

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

## Filtro de acesso ativo

`getActiveEnrollments` permanece como a regra consumida pelo portal e exige simultaneamente:

- matrícula `active`;
- curso `published`;
- `starts_at` menor ou igual ao instante atual;
- `expires_at` nulo ou estritamente posterior ao instante atual.

A suíte usa relógio falso para provar que o início é inclusivo e a expiração é exclusiva.

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

`scripts/check-course-access-contract-tests.mjs` vincula contratos, testes, hook, migration, RPCs, documentação e `package.json`.

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
- build.

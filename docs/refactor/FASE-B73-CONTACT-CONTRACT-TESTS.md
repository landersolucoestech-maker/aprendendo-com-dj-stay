# Fase B73 — contratos de solicitações de contato

## Objetivo

Alinhar os contratos TypeScript/Zod das solicitações de contato aos constraints PostgreSQL e aos payloads das RPCs da Fase B22.

A fase cobre submissão pública autenticada ou anônima, replay idempotente, caixa administrativa, atualização de status e eventos auditáveis.

## Contratos de submissão

`contactSubmissionInputSchema` passou a ser estrito e valida:

- nome entre 2 e 150 caracteres após trim;
- e-mail normalizado em minúsculas, entre 5 e 320 caracteres;
- assunto entre 3 e 200 caracteres;
- mensagem entre 10 e 5.000 caracteres;
- chave de idempotência como UUID;
- rejeição de campos extras.

`contactSubmissionResultSchema` valida o protocolo `CONTATO-XXXXXXXXXXXXXXXX`, status canônico, timestamp com offset, persistência obrigatória e indicação de replay idempotente.

O replay pode retornar o status administrativo atual da mensagem, porque a RPC consulta o mesmo registro persistido antes de responder.

## Caixa administrativa

`contactAdminMessageSchema` reproduz o contrato de tratamento:

- `new` e `in_progress` não possuem operador, timestamp ou nota de resolução;
- `resolved` e `spam` exigem operador, timestamp e nota entre 3 e 2.000 caracteres;
- textos, e-mail, protocolo, UUIDs e timestamps respeitam os limites persistidos;
- `event_count` permanece positivo porque a submissão cria o primeiro evento;
- campos extras são rejeitados.

O dashboard e o resumo também são objetos estritos com contagens inteiras não negativas.

## Atualização de status

Foi criado `contactStatusUpdateInputSchema` como união discriminada:

- `new` e `in_progress` aceitam somente nota nula ou ausente;
- `resolved` e `spam` exigem nota normalizada entre 3 e 2.000 caracteres;
- o identificador da mensagem é validado como UUID.

`src/hooks/useContactMessages.ts` aplica esse contrato antes de chamar `update_contact_message_status` e continua validando a resposta da RPC.

`contactStatusUpdateResultSchema` exige:

- `handled_at = null` para estados abertos;
- `handled_at` presente para estados finais;
- protocolo, UUID, status, timestamp e indicador de duplicidade válidos.

## Eventos auditáveis

Foi criado `contactMessageEventTypeSchema` com os quatro eventos persistidos e `contactMessageEventSchema` com transições canônicas:

- `submitted`: origem nula e destino `new`;
- `status_changed`: mudança real para `new` ou `in_progress`;
- `resolved`: destino `resolved`;
- `marked_spam`: destino `spam`.

O schema também valida referências, ator opcional, objeto JSON de detalhes, timestamp com offset e rejeição de campos extras.

## Testes e gate

`src/contracts/contact-messages.test.ts` cobre:

- normalização e limites da submissão;
- idempotência e status atual no replay;
- coerência dos quatro estados administrativos;
- nota, operador e timestamp de tratamento;
- dashboard estrito;
- input discriminado de atualização;
- resposta resumida por status;
- eventos válidos e transições impossíveis;
- UUIDs, protocolos, timestamps, objetos JSON e campos extras.

`scripts/check-contact-contract-tests.mjs` vincula contratos, testes, hook, migration, RPCs, documentação e `package.json`.

## Arquivos principais

- `src/contracts/contact-messages.ts`
- `src/contracts/contact-messages.test.ts`
- `src/hooks/useContactMessages.ts`
- `scripts/check-contact-contract-tests.mjs`
- `package.json`

## Exclusões deliberadas

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

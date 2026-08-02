# Fase B74 — contratos de aprendizagem e progresso

## Objetivo

Alinhar os contratos TypeScript/Zod do domínio de aprendizagem aos constraints PostgreSQL e ao fluxo ordenado de eventos das Fases B12 e B15.

A fase cobre registros e recortes de aulas, módulos, agregado de progresso, streams por aba e eventos auditáveis.

## Aulas e modos de conclusão

O PostgreSQL mantém o seguinte contrato:

- `media_progress` exige `completion_percent` entre 1 e 100;
- `manual`, `reading_acknowledgement` e `any_activity` exigem `completion_percent = null`.

`lessonRowSchema` e `lessonsResponseSchema` agora reproduzem essa regra e continuam preservando o formato consumido por `useLessons`.

Os recortes de módulos e aulas permanecem estritos, com UUIDs, títulos, ordem e duração validados antes de serem convertidos pelos hooks.

## Agregado de progresso

`progressRowSchema` passou a validar:

- percentual entre 0 e 100;
- tempo assistido não negativo;
- revisão não negativa;
- aula concluída somente com 100%;
- estado inicial com `revision = 0` e os três campos do último evento nulos;
- estado processado com revisão positiva e `last_event_id`, `last_event_received_at` e `last_client_instance_id` preenchidos em conjunto;
- timestamps com offset, UUIDs e rejeição de campos extras.

O mesmo refinamento é aplicado ao recorte de atividades recentes.

## Input de evento

`lessonProgressEventInputSchema` valida:

- identificadores UUID;
- sequência positiva;
- tipo de evento canônico;
- posição entre 0 e 604.800 segundos;
- duração entre 1 e 604.800 segundos;
- posição limitada à duração mais tolerância de 30 segundos;
- timestamp observado com offset;
- rejeição de campos extras.

A janela relativa de `observed_at` — sete dias no passado e cinco minutos no futuro — permanece exclusivamente no RPC, porque depende do relógio transacional do servidor e não deve introduzir testes frontend dependentes do horário corrente.

## Streams e eventos auditáveis

Foram adicionados schemas para `lesson_progress_streams` e `lesson_progress_events`.

Os streams validam identidade do usuário, aula, aba e sessão, sequência positiva, último evento, posição e timestamps.

Os eventos validam:

- sequência, posição, duração e progresso calculado;
- resultado de conclusão e revisão;
- contrato `accepted = true` com `ignored_reason = null`;
- contrato `accepted = false` com motivo entre 1 e 100 caracteres;
- tolerância de posição quando a duração persistida está presente;
- timestamps observado e recebido;
- rejeição de campos extras.

Eventos antigos descartados podem manter `resulting_completed = true` com percentual calculado inferior a 100, pois o RPC registra o cálculo do evento e o estado atual do agregado separadamente. Essa combinação não foi restringida artificialmente no frontend.

## Consumidores

`useUserProgress` já aplicava `parseDataContract` ao input e ao retorno de `save_lesson_progress_event`; a B74 torna esses schemas semanticamente completos.

`useLessonProgressTracker` continua limitando a posição à duração mais 30 segundos antes da chamada, e o schema repete essa proteção na fronteira de dados.

`useLessons` e `useModules` continuam consumindo os recortes estritos sem mudança de interface.

## Fora do escopo

Os metadados editáveis do perfil não foram alterados nesta fase. Sua validação e cobertura pertencem à B53.

Nenhuma regra de currículo administrativo já coberta pela B70 foi duplicada.

Nenhuma migration foi criada ou alterada.

Nenhuma RPC, policy, grant, dado ou configuração do Supabase remoto foi alterado.

A branch `main` não foi modificada. Todo o trabalho permaneceu na branch `dev`.

## Testes e gate

`src/contracts/learning.test.ts` cobre:

- os quatro modos de conclusão;
- recortes de aulas e módulos;
- agregado inicial, processado e concluído;
- quartetos de revisão e último evento;
- input de evento e tolerância de posição;
- streams ordenados;
- eventos aceitos e descartados;
- duração nula no registro auditável;
- UUIDs, limites, timestamps e campos extras.

`scripts/check-learning-progress-contract-tests.mjs` vincula os contratos, testes, consumidores, migrations, RPCs, documentação e `package.json`.

A fase somente pode ser encerrada após o mesmo snapshot aprovar:

- instalação limpa;
- lint;
- testes unitários;
- Supabase CLI;
- banco local e pgTAP;
- geração de tipos;
- TypeScript;
- build.

# Fase B80 — atividades recentes determinísticas

## Objetivo

Separar a normalização do limite e a transformação de atividades recentes da consulta Supabase, permitindo validação unitária determinística sem alterar os contratos persistidos de progresso.

## Módulo puro

Foi criado `src/lib/recent-activities.ts` com:

- `RecentActivity`;
- `RecentProgressRow` inferido de `recentProgressResponseSchema`;
- `normalizeRecentActivityLimit`;
- `toRecentActivity`;
- `toRecentActivities`;
- limites públicos padrão 10 e máximo 100.

A normalização:

- trunca números decimais finitos;
- limita o resultado ao intervalo de 1 a 100;
- usa o padrão 10 para `NaN`, infinito positivo e infinito negativo.

A transformação recebe o instante de referência explicitamente e reutiliza `formatAppRelativeTime`, tornando o texto temporal reproduzível nos testes.

## Estados preservados

- Aula concluída: `Completou "Aula" em Módulo`, tipo `lesson_completed`.
- Aula parcialmente assistida: `Assistiu N% de "Aula"`, tipo `lesson_started`.
- Aula iniciada sem progresso: `Iniciou "Aula" em Módulo`, tipo `lesson_started`.

Também são preservados identificador, timestamp original, títulos, percentual e indicador de conclusão.

## Hook preservado

`src/hooks/useRecentActivities.ts` continua responsável por:

- obter o usuário autenticado;
- consultar `progresso_aulas`;
- filtrar pelo usuário;
- ordenar por `updated_at` decrescente;
- aplicar o limite normalizado;
- validar a resposta com `recentProgressResponseSchema`.

O hook passou a delegar a apresentação para `toRecentActivities` e continua reexportando `RecentActivity`, preservando o componente existente.

## Cobertura

`src/lib/recent-activities.test.ts` cobre:

- valores mínimos, máximos e decimais;
- `NaN` e infinitos;
- aula iniciada, parcialmente assistida e concluída;
- tempo relativo com instante explícito;
- preservação da ordem;
- ausência de mutação das linhas recebidas;
- coleção vazia.

`scripts/check-recent-activities-tests.mjs` impede que normalização ou apresentação retornem ao hook e vincula módulo, suíte, consumidor, schema de progresso, infraestrutura temporal, documentação e `typecheck`.

## Exclusões

- Nenhuma migration foi criada ou alterada.
- Nenhuma RPC foi criada ou alterada.
- Nenhum dado foi alterado.
- O Supabase remoto não foi alterado.
- O Auth e o Storage não foram alterados.
- Nenhuma Edge Function foi alterada ou implantada.
- A branch `main` não foi alterada.

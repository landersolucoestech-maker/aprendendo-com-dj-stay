# Fase B81 — cálculo determinístico do progresso dos módulos

## Objetivo

Separar o cálculo percentual dos módulos e a marcação visual das aulas concluídas da camada React, preservando os hooks e consumidores existentes sem alterar os contratos persistidos de progresso.

## Módulo puro

Foi criado `src/lib/course-progress.ts` com os tipos canônicos:

- `ModuleLesson`;
- `LearningModule`;
- `ModuleLessonWithProgress`;
- `ModuleWithProgress`;
- `LessonCompletionProgress`.

O módulo também expõe `calculateModulesProgress`, que:

- considera concluídas somente linhas com `completada = true`;
- identifica a conclusão pelo `aula_id`;
- usa um `Set` para impedir que duplicatas inflem o percentual;
- considera a aula concluída quando ao menos uma linha verdadeira existe para ela;
- ignora linhas de progresso de aulas ausentes no currículo;
- adiciona `completed` a novas cópias das aulas;
- preserva a ordem e todas as demais propriedades;
- mantém módulos sem aulas em 0%;
- calcula o percentual com `Math.round`, produzindo valores entre 0 e 100.

## Compatibilidade pública

`src/hooks/useModules.ts` continua exportando `ModuleLesson` e `LearningModule`, agora por reexportação do módulo canônico.

`src/hooks/useProgressCalculation.ts` continua exportando:

- `ModuleLessonWithProgress`;
- `ModuleWithProgress`;
- `ProgressCalculationResult`;
- `useProgressCalculation`.

O hook mantém o carregamento e o erro fornecidos por `useUserProgress`, utilizando `useMemo` apenas para delegar a transformação a `calculateModulesProgress`.

## Consumidores preservados

- `Dashboard.tsx` continua calculando o progresso geral e fornecendo os módulos transformados às abas.
- `LessonGrid.tsx` continua exibindo o percentual de cada módulo e encaminhando a aula para `LessonCard`.
- `LessonCard.tsx` continua usando `completed` para ícone, cor e ação `Revisar` ou `Assistir`.
- `ModuleProgress.tsx` continua renderizando o percentual calculado.

## Cobertura

`src/lib/course-progress.test.ts` cobre:

- módulo sem aulas;
- nenhuma aula concluída;
- um terço arredondado para 33%;
- dois terços arredondados para 67%;
- conclusão total em 100%;
- linhas duplicadas;
- linhas conflitantes, com conclusão verdadeira prevalecendo;
- progresso órfão;
- preservação da ordem e propriedades;
- ausência de mutação;
- coleção vazia de módulos.

`scripts/check-course-progress-tests.mjs` impede a volta do cálculo e dos tipos aos hooks, preserva as reexportações públicas, verifica os consumidores e encadeia a suíte após o contrato B74 e antes das atividades recentes B80.

## Exclusões

- Nenhuma migration foi criada ou alterada.
- Nenhuma RPC foi criada ou alterada.
- Nenhum dado foi alterado.
- O Supabase remoto não foi alterado.
- Auth e Storage não foram alterados.
- Nenhuma Edge Function foi alterada ou implantada.
- A branch `main` não foi alterada.

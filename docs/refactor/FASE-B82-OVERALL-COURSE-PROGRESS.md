# Fase B82 — progresso geral ponderado do curso

## Objetivo

Corrigir a métrica exibida como **Progresso Geral** para que represente a proporção real de aulas concluídas no curso.

A implementação anterior calculava a média simples dos percentuais dos módulos. Essa fórmula atribuía o mesmo peso a módulos com quantidades diferentes de aulas. Como consequência, um módulo de uma aula concluída e outro de nove aulas não iniciadas resultavam em 50%, embora somente 1 aula concluída em 10 corresponda a 10%.

## Implementação

A função pura `calculateOverallCourseProgress` foi adicionada a `src/lib/course-progress.ts` e recebe módulos que já passaram pelo cálculo B81.

O cálculo:

- soma a quantidade real de aulas de todos os módulos;
- soma as aulas cujo campo `completed` é verdadeiro;
- ignora módulos vazios no denominador;
- retorna 0% quando o currículo não possui aulas;
- arredonda a proporção de aulas concluídas;
- limita defensivamente o resultado entre 0 e 100;
- não utiliza `module.progress` como fonte da métrica geral;
- não altera módulos nem aulas recebidos.

## Consumidores

A função compartilhada substituiu a média simples em:

- `src/pages/Dashboard.tsx`;
- seção de curso de `src/pages/student/StudentPortal.tsx`.

A métrica independente **Progresso médio** do painel geral do aluno foi preservada. Ela continua representando a média dos percentuais das aulas iniciadas e não foi confundida com o progresso total de um curso.

## Cobertura

A suíte `src/lib/overall-course-progress.test.ts` cobre:

- currículo vazio;
- módulos vazios;
- módulos com quantidades desiguais de aulas;
- regressão principal: 1 aula concluída em 10 resulta em 10%;
- percentuais agregados de módulo contraditórios;
- arredondamento de um e dois terços;
- conclusão integral;
- imutabilidade das entradas.

O checker `scripts/check-overall-course-progress-tests.mjs` protege a função, os dois consumidores, a separação da métrica do painel e a integração no `typecheck`. O gate B81 também foi alinhado para impedir a restauração da média simples.

## Escopo excluído

- Nenhuma migration foi criada ou alterada.
- Nenhuma RPC, tabela, policy ou dado foi alterado.
- Nenhuma Edge Function foi alterada.
- Nenhuma operação foi executada no Supabase remoto.
- Nenhuma alteração foi feita na branch `main`.

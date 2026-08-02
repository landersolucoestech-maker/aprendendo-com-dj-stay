# Fase B58 — Testes unitários dos contratos de autorização

## Objetivo

Adicionar cobertura unitária determinística aos schemas usados pelo frontend para interpretar papéis e linhas da tabela `user_roles`, sem alterar a política de autorização, RLS ou banco.

## Superfície coberta

A suíte `src/contracts/authorization.test.ts` valida:

- aceitação exclusiva dos papéis `aluno`, `afiliado` e `administrador_proprietario`;
- rejeição de papel desconhecido;
- rejeição de capitalização divergente;
- rejeição de valor vazio;
- validação de `user_id` como UUID;
- aceitação de timestamps UTC e com offset explícito;
- rejeição de timestamp sem timezone ou offset;
- rejeição de campos adicionais pelo schema estrito;
- rejeição de linhas incompletas.

## Decisão técnica

Os testes exercitam diretamente `appRoleSchema` e `userRoleRowSchema`. Nenhum papel novo foi criado e nenhuma transformação tolerante foi introduzida. Valores divergentes continuam sendo rejeitados para impedir que o frontend trate metadados arbitrários como autorização válida.

## Contrato permanente

`scripts/check-authorization-tests.mjs` exige:

- permanência dos três papéis canônicos;
- validação UUID;
- timestamps com offset;
- schema estrito;
- cobertura positiva e negativa correspondente;
- script npm dedicado;
- integração do contrato B58 ao `typecheck`.

## Limites de segurança

A validação no frontend é somente defesa de contrato. A decisão efetiva de acesso permanece no Supabase, nas funções privadas, RPCs, grants e políticas RLS. Os testes desta fase não substituem autorização server-side.

## Escopo excluído

- nenhuma migration;
- nenhuma alteração em `user_roles`;
- nenhuma alteração de RLS, grants ou funções SQL;
- nenhuma alteração de rotas ou componentes;
- nenhuma dependência nova;
- nenhum dado ou projeto Supabase alterado;
- nenhuma alteração na branch `main`.

## Critérios de aceite

- suíte unitária aprovada;
- contrato B58 aprovado;
- lint aprovado;
- banco e pgTAP aprovados;
- tipos sincronizados;
- TypeScript aprovado;
- build aprovado.

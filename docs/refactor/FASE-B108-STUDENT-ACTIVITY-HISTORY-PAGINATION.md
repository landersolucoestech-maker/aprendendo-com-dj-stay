# Fase B108 — Paginação do histórico de atividades do aluno

## Objetivo

Permitir que o aluno consulte todo o histórico de progresso, sem ficar limitado aos 100 registros carregados pela implementação anterior.

## Implementação

- Nenhuma migration foi necessária.
- A nova consulta usa a tabela `progresso_aulas` protegida pela RLS existente.
- A consulta exige a sessão obtida por `supabase.auth.getUser()` e reforça o filtro `user_id = user.id`.
- O total é obtido com `count: "exact"`.
- A página é aplicada no servidor por `.range(offset, offset + pageSize - 1)`.
- A ordenação é determinística por `updated_at DESC` e `id DESC`.
- A página usa 20 registros e mantém o resultado anterior durante a atualização.
- Quando o total diminui e invalida a página atual, a interface retorna à última página válida.
- A rota `/aluno/historico` é interceptada pelo `StudentPortalRouter` e renderiza a nova página sem alterar o dashboard.

## Contrato de dados

O contrato valida:

- total inteiro e não negativo;
- linhas de progresso pelo contrato canônico `recentProgressResponseSchema`;
- página nunca maior que o total persistido;
- ausência de campos extras.

## Segurança

A fase não introduz RPC pública nem argumento `user_id`. A consulta permanece vinculada ao usuário autenticado e às políticas RLS de `progresso_aulas`.

## Escopo de ambiente

A implementação foi realizada exclusivamente na branch `dev`. Não houve alteração em `main`, Supabase remoto, produção ou credenciais.

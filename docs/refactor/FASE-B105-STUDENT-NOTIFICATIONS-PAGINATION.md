# Fase B105 — Paginação das notificações do aluno

## Objetivo

Garantir que o aluno consiga consultar todo o histórico de notificações transacionais, sem ficar limitado ao primeiro lote retornado pela RPC.

## Implementação

- A RPC existente `get_my_student_notifications` continua sendo a fonte de verdade.
- Nenhuma migration foi necessária, pois a RPC já aceita `p_limit` e `p_offset` e retorna `total` e `unread_count` globais.
- O hook normaliza o limite entre 1 e 100 registros e impede offset negativo.
- A página usa 20 registros por página e calcula o offset no servidor.
- Os controles Anterior e Próxima ficam bloqueados durante atualização da consulta.
- O total do histórico e a quantidade global de não lidas não são inferidos pelo tamanho da página.
- Marcar uma notificação ou todas como lidas invalida todas as páginas do cache.

## Contrato de dados

O contrato rejeita:

- quantidade de não lidas maior que o total;
- página com mais itens que o total persistido;
- totais negativos ou fracionários;
- campos não previstos.

Uma página menor que o total é válida e representa paginação real no servidor.

## Evidência automatizada

A suíte pgTAP B105 possui 19 asserções e comprova:

- total e quantidade de não lidas independentes do tamanho da página;
- ordenação do item mais recente para o mais antigo;
- offsets adjacentes sem sobreposição;
- limites e offsets inválidos normalizados pelo banco;
- isolamento do histórico por aluno;
- atualização de todas as notificações não lidas, inclusive fora da página atual.

## Segurança

A fase não altera autorização. As notificações continuam isoladas por `auth.uid()` e as RPCs públicas não aceitam `user_id` arbitrário.

## Escopo de ambiente

A implementação foi realizada exclusivamente na branch `dev`. Não houve alteração em `main`, Supabase remoto, produção ou credenciais.

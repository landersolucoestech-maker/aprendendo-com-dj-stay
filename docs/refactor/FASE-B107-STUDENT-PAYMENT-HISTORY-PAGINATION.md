# Fase B107 — Paginação do histórico financeiro do aluno

## Objetivo

Permitir que o aluno consulte todo o histórico de pedidos e pagamentos, sem ficar limitado ao primeiro lote retornado pela RPC.

## Implementação

- A RPC existente `get_my_payment_history` continua sendo a fonte de verdade.
- Nenhuma migration foi necessária, pois a RPC já recebe `p_limit` e `p_offset`, retorna `total` e mantém um resumo global.
- O hook normaliza a página para um valor não negativo e o tamanho entre 1 e 100 registros.
- A interface usa 20 registros por página e envia o offset real ao PostgreSQL.
- Os cards de pedidos, pendentes, pagos e reembolsados permanecem baseados no resumo completo, não no tamanho da página.
- Os controles Anterior e Próxima ficam bloqueados durante atualização da consulta.
- Quando o total diminui e invalida a página atual, a interface retorna automaticamente à última página válida.

## Contrato de dados

O contrato exige que:

- `summary.total_orders` corresponda ao `total` paginado;
- a página nunca contenha mais pedidos que o total persistido;
- totais e itens não possuam campos não previstos.

Uma página menor que o total é válida e representa paginação real no servidor.

## Evidência automatizada

A suíte pgTAP B107 possui 20 asserções e comprova:

- autenticação obrigatória e ausência de execução anônima;
- resumo completo independente do tamanho da página;
- contagens de pedidos pendentes, pagos e reembolsados;
- ordenação determinística do pedido mais recente para o mais antigo;
- offsets adjacentes sem sobreposição;
- limites e offsets inválidos normalizados pelo banco;
- isolamento do histórico por `auth.uid()`.

## Segurança

A fase não altera autorização. A RPC pública não recebe `user_id`, não expõe payloads do provedor e continua vinculada à conta autenticada.

## Escopo de ambiente

A implementação foi realizada exclusivamente na branch `dev`. Não houve alteração em `main`, Supabase remoto, produção ou credenciais.

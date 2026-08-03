# Fase B106 — Paginação dos favoritos do aluno

## Objetivo

Permitir que o aluno consulte todos os cursos e produtos digitais salvos, sem ficar limitado ao primeiro lote retornado pela RPC.

## Implementação

- A RPC existente `get_my_student_favorites` continua sendo a fonte de verdade.
- Nenhuma migration foi necessária, pois a RPC já aceita `p_limit` e `p_offset` e retorna o `total` filtrado.
- O hook normaliza o limite entre 1 e 100 registros e impede offset negativo.
- A página usa 20 registros por página e envia o offset ao servidor.
- O total exibido vem do banco e não do tamanho da página atual.
- Os controles Anterior e Próxima ficam bloqueados durante atualização da consulta.
- Quando a remoção do último favorito esvazia a última página, a interface retorna automaticamente à última página ainda válida.
- A invalidação da mutação atualiza todas as páginas e os estados individuais dos itens.

## Contrato de dados

O contrato aceita páginas menores que o total persistido e rejeita:

- total negativo ou fracionário;
- página com mais favoritos que o total;
- campos não previstos.

## Evidência automatizada

A suíte pgTAP B106 possui 19 asserções e comprova:

- total filtrado sem cursos arquivados;
- ordenação determinística do mais recente para o mais antigo;
- limites e offsets reais no servidor;
- páginas adjacentes sem sobreposição;
- total independente do offset;
- isolamento por `auth.uid()`;
- remoção de favorito localizado fora da primeira página.

## Segurança

A fase não altera autorização. As RPCs continuam sem aceitar `user_id` arbitrário, e cada consulta ou mutação permanece vinculada ao usuário autenticado.

## Escopo de ambiente

A implementação foi realizada exclusivamente na branch `dev`. Não houve alteração em `main`, Supabase remoto, produção ou credenciais.

# Fase B51 — Classificação das evidências do gate

## Objetivo

Separar falhas técnicas acionáveis de execuções incompletas que foram canceladas ou supersedidas pelo mecanismo de concorrência do CI.

## Problema confirmado

A fase B49 encerra automaticamente evidências integralmente verdes e mantém qualquer outra evidência aberta. Essa regra preserva falhas, mas também deixa abertas execuções sem falha explícita que foram interrompidas por um push posterior.

As issues `#412` e `#413` comprovam o caso: ambas possuem etapas `cancelled` ou `skipped`, nenhuma etapa `failure` e foram sucedidas pelos gates integralmente verdes `#414`, `#415` e `#416`.

## Resultados obrigatórios

A evidência passa a registrar explicitamente sete resultados:

- instalação limpa;
- lint;
- configuração da Supabase CLI;
- banco e pgTAP;
- geração e sincronização de tipos;
- TypeScript;
- build.

A inclusão da Supabase CLI impede que uma falha de configuração seja confundida com simples execução supersedida quando a etapa de banco aparece apenas como `skipped`.

## Classificação

### Concluída

A issue é encerrada com `state_reason: completed` somente quando todos os sete resultados são exatamente `success`.

### Falha acionável

A issue permanece aberta quando pelo menos um dos sete resultados é `failure`.

Etapas posteriores podem aparecer como `skipped`, mas a presença do `failure` prevalece e impede o encerramento automático.

### Execução incompleta ou supersedida

A issue é encerrada com `state_reason: not_planned` quando:

- nenhum resultado é `failure`; e
- pelo menos um resultado é `cancelled` ou `skipped`.

Essa classificação preserva a evidência e o histórico, mas remove da fila acionável execuções que não chegaram a produzir um diagnóstico técnico de falha.

## Gate final

O gate final também passa a exigir diretamente `CLI=success`, além dos resultados já obrigatórios. A reconstrução do banco continuar exigindo a configuração bem-sucedida da Supabase CLI.

## Reconciliação restrita

A fase reconcilia apenas as issues recentes `#412` e `#413`, pois existem evidências posteriores e integralmente verdes que comprovam sua supersessão.

Nenhuma regra ampla será aplicada retroativamente às demais evidências históricas incompletas sem análise adicional, porque formatos antigos podem não registrar todas as causas anteriores ao `skipped`.

## Escopo excluído

- nenhuma alteração de aplicação ou frontend;
- nenhuma migration ou dado alterado;
- nenhuma Edge Function alterada;
- nenhum projeto Supabase alterado;
- branch `main` inalterada.

## Critérios de aceite

- Supabase CLI registrada na evidência;
- Supabase CLI exigida no gate final;
- verde encerrado como `completed`;
- presença de `failure` mantida aberta;
- incompleta sem `failure` encerrada como `not_planned`;
- contratos estáticos atualizados;
- documentação operacional atualizada;
- gate integral aprovado na branch `dev`.

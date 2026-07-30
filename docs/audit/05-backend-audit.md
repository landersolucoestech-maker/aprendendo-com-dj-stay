# FASE A4 — Backend, Edge Functions e regras de negócio

Status: concluída.

## Estado encontrado

Não existe backend de aplicação no repositório nem nos ambientes Supabase atuais.

- Edge Functions em `dev`: 0.
- Edge Functions em produção: 0.
- Serviços server-side: 0 comprovados.
- Webhooks: 0.
- Filas/workers: 0.
- API própria: 0.

A aplicação executa chamadas diretas do navegador ao Supabase legado.

## Matriz de regras críticas

| Domínio | Implementação encontrada | Estado |
| --- | --- | --- |
| autenticação | arquivos React órfãos | incompleta/inacessível |
| autorização | removida das rotas ativas | ausente |
| matrícula | nenhuma entidade operacional | ausente |
| acesso ao curso | leitura pública ou estado visual | inseguro |
| progresso | upsert legado + estado local | inconsistente |
| certificado | toast | simulado |
| contato | `setTimeout` | simulado |
| upload | cliente direto em bucket legado | inseguro/inoperante no ambiente atual |
| downloads | blob fabricado no browser | simulado |
| checkout | histórico removido, sem provider atual | ausente |
| Pix | nenhuma implementação | ausente |
| webhook | nenhuma implementação | ausente |
| afiliados | nenhuma implementação | ausente |
| comissões | nenhuma implementação | ausente |

## Achados

### AUD-BE-001 — Regras sensíveis no cliente

O frontend decide conclusão, disponibilidade, mensagens de sucesso e conteúdo. Não há validação transacional no backend.

### AUD-BE-002 — Ausência de idempotência

Não foram encontrados mecanismos de idempotência para:

- pagamentos;
- webhooks;
- progresso;
- concessão de acesso;
- matrícula;
- downloads;
- contato;
- upload.

### AUD-BE-003 — Ausência de transações de domínio

Não existem operações atômicas para confirmar pedido, pagamento, matrícula, acesso, comissão e auditoria.

### AUD-BE-004 — Histórico de pagamento removido

O histórico Git mostra implementações anteriores de `Payment`, `AccessControl` e `useSubscription`, posteriormente removidas. A implementação se baseava em uma linha `user_subscriptions`, sem pedido, tentativa, transação, evento, webhook, reembolso, chargeback ou ledger.

### AUD-BE-005 — Ausência de validação de entrada server-side

Não existem schemas server-side para formulários, uploads, pagamentos, cursos, produtos ou afiliados.

### AUD-BE-006 — Ausência de observabilidade de backend

Não existem logs estruturados, correlation IDs, trilha de auditoria, métricas, alertas ou tratamento de retries/timeouts.

## Conclusão

A camada backend deverá ser criada como parte da refatoração. O frontend não pode continuar como autoridade sobre acesso, preço, pagamento, progresso, certificados ou entrega de arquivos.

## Próxima fase sequencial

FASE A5 — Banco de dados e migrations.
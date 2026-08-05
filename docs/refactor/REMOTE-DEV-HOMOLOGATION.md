# Homologação remota do Supabase `dev`

## Objetivo

Comprovar, fora da sessão administrativa do banco, o comportamento HTTP real do catálogo público e da limitação de submissões anônimas de contato no gateway do Supabase de desenvolvimento.

Esta execução não promoveu `main`, não alterou o Supabase de produção e não utilizou `service_role`.

## Snapshot

- branch: `dev`;
- commit testado: `b665dd9bcd6e1c91a121f584d21cf20e834a5c34`;
- Supabase `dev`: `jmtyurketfclaneqxohu`;
- GitHub Actions run: `30974559049`;
- resultado do job `validate`: `success`;
- artifact: `remote-dev-validation-b665dd9bcd6e1c91a121f584d21cf20e834a5c34`;
- artifact digest: `sha256:3efcd15f5f208b4a4df96e0488c1e87305e3fbadebaaaec94f2b2f2aadd2e7b1`.

## Catálogo público

O runner chamou `POST /rest/v1/rpc/get_public_course_catalog` usando a chave publishable do ambiente de desenvolvimento.

Configuração:

- 200 requisições;
- concorrência 10;
- timeout individual de 15 segundos;
- validação de status HTTP e do contrato JSON com campo `courses` em array.

Resultado:

| Métrica | Valor |
| --- | ---: |
| Respostas válidas | 200 |
| Falhas | 0 |
| Tempo total | 7.148,06 ms |
| Média | 342,30 ms |
| p50 | 213,59 ms |
| p95 | 977,80 ms |
| p99 | 1.033,84 ms |

Como o banco está sem cursos publicados, esta prova mede o caminho HTTP e o read model no estado vazio. Ela não substitui carga com catálogo e usuários reais.

Uma prova adicional dentro do PostgreSQL executou 2.000 chamadas ao mesmo read model sob o papel `anon`, dentro de transação revertida:

- total: 4.158,28 ms;
- média: 2,0791 ms por chamada;
- zero retorno nulo;
- zero persistência.

## Rate limit anônimo de contato

O runner externo realizou seis chamadas sequenciais a `POST /rest/v1/rpc/submit_contact_message` a partir da mesma origem de rede.

As cinco primeiras chamadas retornaram HTTP 200 e `persisted: true`. Referências persistidas temporariamente:

1. `CONTATO-33F8694B9DBE9633`;
2. `CONTATO-E8FAE30879AA1C28`;
3. `CONTATO-74B05C8ACFB09CFB`;
4. `CONTATO-362068BADD8E55CF`;
5. `CONTATO-DCF03C64F5D908D1`.

A sexta chamada retornou:

```json
{
  "status": 400,
  "code": "P0001",
  "details": "Anonymous mutation quota exceeded.",
  "hint": "Retry after the active rate-limit window.",
  "message": "RATE_LIMITED"
}
```

O contador privado correspondente foi observado com:

- scope: `contact_submission`;
- request count: 5;
- janela iniciada em `2026-08-05 04:00:00+00`;
- atualização em `2026-08-05 04:14:57.633497+00`;
- expiração em `2026-08-06 04:15:00+00`;
- identidade armazenada somente como HMAC-SHA256, sem IP bruto.

## Limpeza pós-teste

Após a coleta da evidência foram removidos, nesta ordem:

- eventos filhos das cinco mensagens;
- cinco mensagens com marker `REMOTE-HTTP-VALIDATION-30974559049`;
- contador HMAC exato da janela de teste.

Validação final:

- mensagens residuais: 0;
- contadores residuais da prova: 0.

## Crons observados

A consulta remota de `cron.job_run_details` confirmou execuções reais com status `succeeded` para:

- `expire-due-checkout-intents` em sequência de cinco em cinco minutos;
- `prune-platform-cron-run-history`;
- `prune-anonymous-mutation-rate-limits`.

Na janela consultada não houve falha desses jobs.

## Advisors

- security advisor: zero lints;
- performance advisor: somente avisos `INFO` de índices ainda não utilizados e a recomendação informativa sobre estratégia de conexões do Auth.

Nenhum índice foi removido, porque o ambiente permanece sem massa operacional e sem tráfego representativo.

## Limites desta prova

Permanecem fora deste escopo:

- login e sessão de um usuário real;
- matrícula ativa;
- upload e playback de mídia privada;
- checkout e eventos reais do sandbox Asaas;
- envio e recebimento de e-mails transacionais;
- carga autenticada com dados representativos;
- pentest independente.

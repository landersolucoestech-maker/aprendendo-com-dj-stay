# Contratos remotos das Edge Functions

Este runbook registra provas HTTP não mutáveis executadas contra o projeto Supabase `dev` (`jmtyurketfclaneqxohu`). Nenhuma chamada deste smoke cria usuário, checkout, evento financeiro, contato, token de playback ou outro dado operacional.

## Automação

- workflow: `.github/workflows/remote-edge-contracts.yml`;
- executor: `scripts/check-remote-edge-contracts.mjs`;
- evidência: artifact `remote-edge-contracts-<commit>/evidence.json`;
- execução manual disponível por `workflow_dispatch`;
- execução automática quando o workflow ou o executor forem alterados na branch `dev`.

## Superfícies verificadas

### `create-asaas-checkout`

A função usa `verify_jwt=true`. O gateway do Supabase rejeita chamadas sem `Authorization` antes de executar o código da função.

O smoke exige:

- preflight da origem de desenvolvimento com HTTP 204;
- POST sem JWT com HTTP 401 e código `UNAUTHORIZED_NO_AUTH_HEADER`;
- a mesma precedência do gateway mesmo quando a origem enviada é inválida.

O teste não cria sessão, não chama `prepare_checkout_intent` e não alcança a API Asaas.

### `media-playback`

O smoke exige:

- preflight permitido com HTTP 204;
- credenciais sintaticamente inválidas com HTTP 400 e `INVALID_PLAYBACK_CREDENTIALS`;
- origem proibida com HTTP 403 e `ORIGIN_NOT_ALLOWED`;
- `Cache-Control: no-store` e `X-Content-Type-Options: nosniff` nas respostas produzidas pela função.

As credenciais inválidas são rejeitadas antes da RPC de resolução e antes de qualquer acesso ao Storage.

### `asaas-webhook`

O probe não envia `asaas-access-token`. Portanto:

- HTTP 401 com `WEBHOOK_AUTHENTICATION_FAILED` comprova que `ASAAS_WEBHOOK_TOKEN` está configurado;
- HTTP 503 com `WEBHOOK_NOT_CONFIGURED` comprova que o secret ainda está ausente ou inválido.

A chamada é rejeitada antes do parse e antes da RPC `process_asaas_payment_webhook`.

## Estado observado em 5 de agosto de 2026

O run `31002211539` aprovou o contrato remoto estrutural. Checkout e playback falharam fechado conforme esperado. O webhook retornou HTTP 503 com `WEBHOOK_NOT_CONFIGURED`; portanto `ASAAS_WEBHOOK_TOKEN` ainda não está configurado no Supabase `dev`.

## Remediação externa necessária

1. Gerar um token aleatório forte, com pelo menos 16 caracteres.
2. Configurar esse valor como secret `ASAAS_WEBHOOK_TOKEN` no projeto Supabase `dev`.
3. Configurar exatamente o mesmo valor no webhook do sandbox Asaas, no header `asaas-access-token`.
4. Reexecutar o workflow `Contratos remotos das Edge Functions`.
5. Confirmar que o probe muda de HTTP 503 para HTTP 401 `WEBHOOK_AUTHENTICATION_FAILED`.

O valor do token nunca deve ser incluído em issue, artifact, log, código, documentação ou variável pública do frontend.

Esta prova não confirma `ASAAS_API_KEY`, URLs de callback, criação real de checkout, recebimento de um evento assinado pelo provider ou concessão de acesso após pagamento. Esses itens continuam dependendo de credenciais e massa operacional válidas no sandbox.

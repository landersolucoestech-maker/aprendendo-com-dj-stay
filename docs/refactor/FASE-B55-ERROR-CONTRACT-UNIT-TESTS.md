# Fase B55 — Testes unitários de contratos e mensagens de erro

## Objetivo

Proteger a camada compartilhada que valida payloads com Zod e transforma erros desconhecidos em mensagens exibíveis pela interface, sem alterar sua política funcional.

## Riscos cobertos

Falhas nessa camada podem:

- aceitar dados que não respeitam o contrato esperado;
- perder o contexto técnico necessário para diagnóstico;
- descartar as issues produzidas pelo Zod;
- expor detalhes internos de validação ao usuário final;
- ocultar mensagens explícitas de erros operacionais;
- deixar de aplicar fallback para valores desconhecidos ou erros sem mensagem útil.

## Suíte de contratos

`src/contracts/contract-error.test.ts` cobre:

- retorno do payload validado e transformado;
- trim aplicado pelo schema;
- lançamento de `DataContractError` em payload inválido;
- nome, mensagem e contexto do erro;
- preservação das issues do Zod;
- paths dos campos inválidos;
- presença dos códigos de validação.

## Suíte de mensagens

`src/lib/error-message.test.ts` cobre:

- sanitização de `DataContractError` para uma mensagem pública genérica;
- não exposição do contexto ou da mensagem técnica do contrato;
- preservação da mensagem explícita de um `Error` comum;
- fallback padrão para `Error` vazio ou composto apenas por espaços;
- fallback padrão para string, `null`, `undefined`, número e outros valores desconhecidos;
- fallback customizado fornecido pelo consumidor.

## Política preservada

A fase não altera `getErrorMessage` nem `parseDataContract`.

A política existente permanece:

1. `DataContractError` recebe mensagem pública sanitizada;
2. `Error` com mensagem não vazia preserva sua mensagem;
3. qualquer outro valor utiliza o fallback informado ou o fallback padrão.

## Contrato permanente

`scripts/check-error-contract-tests.mjs` valida:

- a estrutura de `DataContractError` e o uso de `safeParse`;
- a política de sanitização e fallback;
- a permanência dos principais cenários nas duas suítes;
- o script npm dedicado;
- a integração do contrato B55 ao `typecheck`.

A execução real permanece centralizada em `npm run test:unit`.

## Escopo excluído

- nenhuma alteração na política de mensagens;
- nenhuma filtragem adicional de mensagens de integrações;
- nenhuma dependência nova;
- nenhuma migration, dado ou Edge Function alterada;
- nenhum projeto Supabase ou branch `main` alterado.

## Critérios de aceite

- suíte unitária completa aprovada;
- contrato B55 aprovado;
- lint aprovado;
- Supabase CLI configurada;
- banco e pgTAP aprovados;
- tipos sincronizados;
- TypeScript aprovado;
- build aprovado.

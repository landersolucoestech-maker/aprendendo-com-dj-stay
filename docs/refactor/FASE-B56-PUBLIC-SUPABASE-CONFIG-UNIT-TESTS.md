# Fase B56 — Testes unitários da configuração pública do Supabase

## Objetivo

Proteger o contrato que vincula ambiente da aplicação, modo de build Vite, project ref e credencial pública do Supabase antes da inicialização do cliente frontend.

## Riscos cobertos

Uma regressão nessa camada pode:

- conectar um build de desenvolvimento ao projeto de produção;
- conectar um build de produção ao projeto de desenvolvimento;
- aceitar URL sem HTTPS ou com path, query, hash, credenciais ou porta;
- aceitar hostname fora de `supabase.co`;
- expor uma chave secreta ou `service_role` no bundle frontend;
- aceitar JWT público com papel diferente de `anon`;
- aceitar uma chave anon pertencente a outro projeto;
- iniciar a aplicação com ambiente Vite incompatível.

## Inicialização real sob teste

`src/config/public-config.test.ts` controla `import.meta.env` com `vi.stubEnv`, restaura o ambiente após cada teste e recarrega o módulo com `vi.resetModules`.

Isso permite validar tanto `createPublicConfig` quanto a inicialização real do singleton exportado `publicConfig`, sem modificar o código de produção. O Vitest suporta alteração e restauração de `import.meta.env`, incluindo os booleanos especiais `DEV` e `PROD`.

## Cobertura

A suíte valida:

- configuração development com project ref `jmtyurketfclaneqxohu`;
- configuração production com project ref `tduvfrxagujryfnqpdmc`;
- normalização de espaços e barra final;
- congelamento do objeto retornado;
- chave `sb_publishable_` com formato mínimo válido;
- JWT anon legado pertencente ao projeto esperado;
- ausência ou valor inválido de `VITE_APP_ENV`;
- divergência entre `VITE_APP_ENV`, `MODE`, `DEV` e `PROD`;
- URL ausente, inválida, HTTP, com credenciais, porta, path, query ou hash;
- hostname fora de `supabase.co`;
- project ref incompatível com o ambiente;
- chave ausente, `sb_secret_`, contendo `service_role`, publishable curta ou formato desconhecido;
- JWT com payload inválido, role diferente de `anon` ou ref divergente.

## Contrato permanente

`scripts/check-public-config-tests.mjs` valida:

- project refs canônicos no código de produção;
- exigência HTTPS e origem pura;
- bloqueio de chaves privilegiadas;
- validação de role e ref do JWT legado;
- congelamento da configuração;
- permanência dos principais cenários da suíte;
- script npm dedicado;
- integração do contrato B56 ao `typecheck`.

## Escopo excluído

- nenhuma mudança na política de ambientes;
- nenhuma mudança nas credenciais configuradas;
- nenhuma dependência nova;
- nenhuma migration, dado ou Edge Function alterada;
- nenhum projeto Supabase ou branch `main` alterado.

## Critérios de aceite

- suíte unitária completa aprovada;
- contrato B56 aprovado;
- lint aprovado;
- Supabase CLI configurada;
- banco e pgTAP aprovados;
- tipos sincronizados;
- TypeScript aprovado;
- build aprovado.

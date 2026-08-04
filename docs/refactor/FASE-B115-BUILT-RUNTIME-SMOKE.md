# FASE B115 — Smoke test HTTP do artefato compilado

## Problema comprovado

O build da branch `dev` validava o grafo de chunks e o manifesto `dist/release.json`, mas não iniciava o servidor de preview nem comprovava que o artefato era entregue corretamente por HTTP.

Assim, ainda não existia garantia automatizada para:

- carregamento da página inicial compilada;
- fallback SPA em uma rota interna;
- entrega do favicon e dos assets JavaScript/CSS referenciados;
- tipos de conteúdo mínimos;
- disponibilidade do `release.json` pelo mesmo servidor;
- encerramento do processo de preview após a validação.

## Implementação

O contrato `scripts/check-built-runtime-smoke.mjs` inicia o binário local do Vite em uma porta efêmera do loopback, usando `vite preview` e `--strictPort`.

A validação executa requisições HTTP reais para:

- `/`;
- `/aluno/cursos`, comprovando o fallback SPA;
- `/release.json`;
- `/favicon.ico`;
- cada asset local referenciado no HTML compilado.

O gate verifica status HTTP, conteúdo não vazio, tipos de conteúdo compatíveis, presença do elemento raiz, ausência dos artefatos externos removidos na B114 e igualdade entre o manifesto servido e o arquivo compilado.

O processo filho é encerrado em bloco `finally`, com escalonamento de `SIGTERM` para `SIGKILL` apenas se o preview não finalizar dentro do limite defensivo.

## Integração

O smoke test é encadeado por `scripts/check-release-artifact.mjs`. Portanto, ele executa somente depois que o Vite produz `dist`, os chunks são validados e a proveniência imutável da release é comprovada.

Qualquer falha HTTP, asset ausente, MIME incompatível, fallback quebrado ou processo de preview inválido bloqueia o build.

## Limites

O B115 valida o artefato servido pelo preview local. Ele não substitui:

- teste end-to-end em navegador real;
- validação do ambiente de hospedagem definitivo;
- Content Security Policy e headers configurados na borda;
- homologação de Supabase, pagamentos, mídia ou e-mails;
- teste de carga ou pentest independente.

## Exclusões

- Nenhuma migration foi criada ou alterada.
- O Supabase remoto não foi modificado.
- A branch `main` não foi alterada.
- Nenhuma dependência foi adicionada.
- A aprovação em `dev` não equivale a homologação externa ou promoção para produção.

# FASE B118 — Smoke test em navegador headless

## Problema comprovado

O B115 comprovou a entrega HTTP do artefato compilado, o fallback SPA e os assets locais. Contudo, uma resposta HTTP válida não garante que o JavaScript seja executado, que o React hidrate a aplicação ou que as rotas públicas renderizem sem acionar o Error Boundary.

## Implementação

Após o build aprovado, o workflow inicia `vite preview` no loopback e executa o Chrome headless já fornecido pelo runner `ubuntu-24.04`.

São abertas as rotas públicas:

- `/`;
- `/login`;
- `/certificado`.

Para cada rota, o navegador:

- executa o JavaScript compilado;
- aguarda uma janela virtual limitada para consultas e renderização;
- exporta o DOM final com `--dump-dom`;
- grava a evidência em `artifacts/browser-smoke`;
- valida idioma, título, raiz hidratada e conteúdo estável da rota;
- rejeita a interface do Route Error Boundary;
- rejeita artefatos herdados de Lovable ou GPT Engineer.

O processo de preview e os diretórios temporários do navegador são sempre encerrados e removidos, inclusive em caso de falha.

## Integração ao gate

O workflow possui o estágio bloqueante `Smoke no navegador`, executado somente quando o build termina com sucesso. Seu resultado é registrado na issue de evidência, participa do gate final e é exportado como artefato de curta retenção.

O contrato estático `scripts/check-browser-runtime-smoke-contract.mjs` é encadeado ao gate de determinismo do CI e impede a remoção silenciosa do estágio, das rotas, das asserções ou da coleta de evidências.

## Limites

O B118 valida renderização pública sem autenticação e sem interação de formulário. Ele não substitui:

- fluxos E2E autenticados;
- homologação financeira;
- testes em múltiplos navegadores;
- teste visual por comparação de pixels;
- validação do provedor de hospedagem definitivo;
- teste de carga ou pentest independente.

## Exclusões

- Nenhuma migration foi criada ou alterada.
- O Supabase remoto não foi modificado.
- A branch `main` não foi alterada.
- Nenhuma dependência ou lockfile foi alterado.
- A aprovação em `dev` não equivale a homologação externa ou promoção para produção.

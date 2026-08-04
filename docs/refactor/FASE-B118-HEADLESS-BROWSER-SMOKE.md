# FASE B118 — Smoke test em navegador headless

## Problema comprovado

O B115 comprovou a entrega HTTP do artefato compilado, o fallback SPA e os assets locais. Contudo, uma resposta HTTP válida não garante que o JavaScript seja executado, que o React renderize a aplicação ou que as rotas públicas funcionem sem acionar o Error Boundary.

A primeira versão do B118 usava `--dump-dom`. O artefato comprovou que módulos do bundle eram executados, inclusive com estilos injetados em runtime, mas o Chrome podia exportar o documento antes do commit concorrente do React 18. Portanto, raiz vazia no `dump-dom` não distinguia de forma confiável uma exceção real de uma corrida de captura.

A primeira versão em CDP corrigiu essa corrida, porém ainda considerava a página pronta assim que `#root` recebia qualquer conteúdo. Os artefatos do gate demonstraram que isso aceitava estados transitórios como `Carregando conteúdo...` e `Verificando sua sessão...`. A prontidão passou, então, a depender do conteúdo final contratado para cada rota.

## Implementação

Após o build aprovado, o workflow inicia `vite preview` no loopback e executa o Chrome headless já fornecido pelo runner `ubuntu-24.04`.

O smoke controla o navegador pelo Chrome DevTools Protocol, sem Playwright, Puppeteer, Selenium ou nova dependência. Para cada rota, ele:

1. cria um target isolado;
2. habilita `Page`, `Runtime` e `Log`;
3. registra exceções JavaScript, mensagens de console e erros do navegador;
4. define o viewport pelo domínio `Emulation`;
5. navega para a URL pública;
6. aguarda o evento de carregamento;
7. consulta o DOM até `#root` possuir conteúdo **e** todos os fragmentos finais contratados para a rota estarem presentes;
8. rejeita fallbacks transitórios que não evoluam dentro do limite defensivo;
9. exporta o DOM final e os diagnósticos para `artifacts/browser-smoke`.

São abertas as rotas públicas:

- `/`;
- `/login`;
- `/certificado`.

Para cada rota, o gate valida idioma, título, raiz renderizada, conteúdo estável da página e ausência da interface do Route Error Boundary. Artefatos herdados de Lovable ou GPT Engineer também permanecem proibidos.

O processo de preview, o Chrome, os targets e os diretórios temporários são sempre encerrados e removidos, inclusive em caso de falha.

## Evidência aprovada

O commit `f5e193a5e07a2ceca00b4b3f38034334fcb0db10` concluiu o mesmo snapshot com:

- instalação limpa;
- lint;
- testes unitários;
- reconstrução local do Supabase e pgTAP;
- sincronização de tipos;
- contratos estáticos e TypeScript;
- build e smoke HTTP;
- Chrome headless com conteúdo final de home, login e certificado.

## Integração ao gate

O workflow possui o estágio bloqueante `Smoke no navegador`, executado somente quando o build termina com sucesso. Seu resultado é registrado na issue de evidência, participa do gate final e é exportado como artefato de curta retenção.

O contrato estático `scripts/check-browser-runtime-smoke-contract.mjs` é encadeado ao gate de determinismo do CI e impede a remoção silenciosa do estágio, das rotas, da espera pelo conteúdo final, da captura de exceções ou da coleta de evidências.

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

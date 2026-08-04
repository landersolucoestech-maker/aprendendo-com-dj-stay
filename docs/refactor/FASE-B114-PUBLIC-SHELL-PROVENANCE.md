# FASE B114 — Proveniência do shell público

## Problema comprovado

O `index.html` da branch `dev` ainda continha artefatos herdados do gerador inicial:

- idioma raiz definido como inglês;
- título e metadados de outro produto;
- autoria, descrição e perfis sociais da Lovable;
- imagens sociais hospedadas em domínio externo não aprovado;
- script remoto do GPT Engineer executado antes da aplicação;
- comentário que tentava impedir a remoção desse script.

Esse estado criava divergência de identidade, dependência de execução fora do lockfile, superfície de supply chain não auditada e transferência desnecessária para terceiros durante o carregamento público.

## Implementação

O shell público passou a declarar somente metadados compatíveis com a identidade operacional já versionada:

- idioma `pt-BR`;
- título `Aprendendo com DJ Stay`;
- descrição institucional neutra;
- autoria `LANDER SOLUTIONS`;
- favicon local versionado;
- Open Graph sem imagem ou conta social não aprovadas;
- Twitter Card sem perfil ou imagem externos;
- único script executável: `/src/main.tsx`.

Foram removidas todas as referências a Lovable, GPT Engineer, `cdn.gpteng.co`, imagens externas e instruções herdadas do gerador.

## Garantias permanentes

O contrato `scripts/check-public-shell-provenance.mjs` verifica:

- idioma, título, descrição, autoria e metadados públicos;
- ausência de URLs HTTP/HTTPS no documento raiz;
- ausência de marcas, domínios, comentários e scripts herdados;
- existência de um único script com origem local;
- uso de favicon local;
- coerência com `src/config/brand.ts`;
- encadeamento bloqueante pelo gate de supply chain.

## Segurança e privacidade

A aplicação não executa mais JavaScript remoto não declarado no `package-lock.json` durante o bootstrap. O carregamento inicial também não referencia imagens, perfis ou domínios sociais de terceiros.

A mudança não adiciona Content Security Policy por metatag, pois uma política definitiva deve ser configurada no ambiente de hospedagem com conhecimento das origens necessárias para Supabase, pagamentos, mídia e observabilidade.

## Exclusões

- Nenhuma migration foi criada ou alterada.
- O Supabase remoto não foi modificado.
- A branch `main` não foi alterada.
- A identidade visual definitiva, logo, domínio canônico, imagem Open Graph e perfis sociais continuam dependentes de definição formal.
- A aprovação do gate em `dev` não equivale a homologação externa ou promoção para produção.

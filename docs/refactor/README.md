# Refatoração sequencial

As fases deste diretório registram decisões técnicas e garantias adicionadas à branch `dev`. A numeração expressa dependência de execução; não autoriza trabalho paralelo nem promoção automática para produção.

## Princípios

- uma causa observada por vez;
- migrations e contratos versionados antes de declarar conclusão;
- nenhum `--force`, bypass de lint ou desativação de segurança para obter gate verde;
- Supabase de produção somente leitura até autorização explícita;
- índices não são removidos com base em um banco de desenvolvimento sem tráfego;
- implementação em `dev` não equivale a homologação externa ou produção.

## Fases consolidadas

A sequência cobre, entre outros domínios:

- ambiente, autenticação, autorização e storage;
- cursos, currículo, matrículas, player e progresso;
- marketplace, pagamentos, afiliados e certificados;
- contatos e observabilidade;
- verdade operacional, design system e acessibilidade;
- performance, datas, dependências e supply chain;
- higiene do repositório, hardening do banco e integridade dos chunks;
- proveniência do shell público e remoção de scripts externos herdados;
- entrega HTTP do artefato, fallback SPA e manifesto de release;
- execução do frontend em Chrome headless por CDP, com espera pelo conteúdo final das rotas públicas e captura de exceções.

Cada arquivo `FASE-B*.md` descreve uma entrega específica. O estado consolidado está em [`../STATUS.md`](../STATUS.md).

## Validação

```bash
npm run check
```

O comando local consolidado permanece bloqueante para instalação, lint, banco e pgTAP, tipos, contratos, TypeScript, audit, build e validações de artefatos.

No GitHub Actions, o mesmo snapshot também precisa passar:

- smoke HTTP do build servido;
- fallback das rotas SPA;
- resolução dos assets locais;
- Chrome headless controlado pelo DevTools Protocol;
- conteúdo final de `/`, `/login` e `/certificado`;
- ausência de exceções JavaScript não tratadas e do Route Error Boundary.

Uma fase só é considerada concluída quando todas as validações aplicáveis ao seu escopo passam no mesmo snapshot. A aprovação do artefato público não equivale a homologação financeira, teste E2E autenticado, pentest ou promoção para produção.

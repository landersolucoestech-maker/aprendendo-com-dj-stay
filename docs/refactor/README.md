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
- higiene do repositório, hardening do banco e integridade dos chunks.

Cada arquivo `FASE-B*.md` descreve uma entrega específica. O estado consolidado está em [`../STATUS.md`](../STATUS.md).

## Validação

```bash
npm run check
```

O comando consolidado deve permanecer bloqueante. Uma fase só é considerada concluída quando o mesmo snapshot passa instalação, lint, banco e pgTAP, tipos, contratos, TypeScript, audit, build e validações de artefatos.

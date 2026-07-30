# FASE A11 — Dependências, supply chain e configuração

Status: concluída sem atualizar dependências.

## Manifests e lockfiles

- `package.json` presente;
- `package-lock.json` presente;
- `bun.lockb` presente;
- `packageManager` ausente;
- `engines.node` ausente;
- nome do pacote genérico;
- versão `0.0.0`;
- dependências declaradas com ranges `^`.

## Achados

### AUD-DEP-001 — Dois lockfiles concorrentes

A presença de npm e Bun sem package manager oficial impede garantir instalação reproduzível.

### AUD-DEP-002 — Runtime não declarado

O ambiente possui Node.js 22.16.0 e npm 10.9.2, mas o repositório não declara versão mínima ou intervalo suportado.

### AUD-DEP-003 — Scripts insuficientes

Scripts existentes:

- `dev`;
- `build`;
- `build:dev`;
- `lint`;
- `preview`.

Ausentes:

- `typecheck`;
- testes unitários;
- testes de componentes;
- testes E2E;
- testes SQL;
- auditoria de dependências;
- geração de tipos;
- validação de migrations.

### AUD-DEP-004 — Regras TypeScript enfraquecidas

`strict`, `strictNullChecks`, `noImplicitAny`, `noUnusedLocals` e `noUnusedParameters` estão desabilitados em parte da configuração. `allowJs` está habilitado sem justificativa.

### AUD-DEP-005 — Regra ESLint desativada

`@typescript-eslint/no-unused-vars` está desligada. O modo recomendado não é type-aware.

### AUD-DEP-006 — Plugin Lovable em runtime de desenvolvimento

`lovable-tagger` está integrado ao Vite e o HTML carrega script externo do GPT Engineer. Não há justificativa de supply chain, política de versões ou necessidade em produção.

### AUD-DEP-007 — Configuração ESM inconsistente

O pacote usa `"type": "module"`, mas `tailwind.config.ts` chama `require("tailwindcss-animate")`.

### AUD-DEP-008 — Dependências sem consumidor comprovado

O manifesto inclui bibliotecas como Recharts, Embla, Vaul e painéis redimensionáveis sem consumidor de domínio comprovado na auditoria remota. A remoção depende de enumeração final de imports.

### AUD-DEP-009 — Auditoria de vulnerabilidades bloqueada

Não foi possível executar instalação limpa ou `npm audit` porque o checkout privado não está disponível no executor e o acesso a GitHub falha por DNS.

## Compatibilidade

As versões declaradas são coerentes como geração de template de 2024/2025, mas a compatibilidade real não foi comprovada por instalação e build. Nenhuma atualização será realizada antes do baseline reproduzível.

## Configuração de ambiente

Vite expõe todas as variáveis `VITE_*` no bundle do cliente. Portanto, apenas URL e chave publicável podem ser usadas nesse namespace; segredos de provider, webhook ou service role deverão permanecer exclusivamente no backend.

## Próxima fase sequencial

FASE A12 — Build, lint, typecheck e testes.
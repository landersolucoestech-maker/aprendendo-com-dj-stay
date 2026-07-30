# FASE A12 — Build, lint, typecheck e testes

Status: concluída com execução bloqueada e causas documentadas.

## Scripts disponíveis

```text
npm run dev
npm run build
npm run build:dev
npm run lint
npm run preview
```

Não existe script de typecheck ou teste.

## Execução

| Operação | Resultado |
| --- | --- |
| checkout privado | falha DNS para `github.com`, código 128 |
| instalação limpa | não executável sem checkout |
| lint | não executável sem checkout |
| typecheck | script ausente e checkout indisponível |
| build | não executável sem checkout |
| testes unitários | infraestrutura ausente |
| testes de componentes | infraestrutura ausente |
| testes SQL | infraestrutura ausente |
| testes E2E | infraestrutura ausente |
| auditoria de dependências | não executável sem instalação |
| CI remoto | nenhum status e nenhum workflow run no HEAD de `dev` |

## Achados

### AUD-TEST-001 — Ausência total de suíte automatizada

Não foram comprovados arquivos ou scripts de teste para lógica, componentes, SQL, integração, E2E ou acessibilidade.

### AUD-TEST-002 — Build não é gate

Não existe workflow de CI comprovado. O commit de `dev` não possui checks ou workflow runs associados.

### AUD-TEST-003 — TypeScript permissivo

Mesmo quando executado, o compilador não detectará várias classes de erro porque as opções estritas estão desabilitadas.

### AUD-TEST-004 — Sem testes negativos de segurança

Não existem validações de RLS, ownership, papel, matrícula, compra, download, reembolso ou revogação.

### AUD-TEST-005 — Sem evidência funcional

Mensagens de sucesso são usadas como substituto de teste e persistência. Isso não constitui evidência.

## Baseline esperado para refatoração

Antes de funcionalidade nova, deverão existir:

- `typecheck` separado do build;
- lint determinístico;
- build limpo;
- Vitest para domínio e componentes;
- pgTAP/SQL para migrations, RLS e RPCs;
- Playwright para fluxos críticos;
- axe ou equivalente para acessibilidade;
- workflow GitHub Actions bloqueando merge.

## Próxima fase sequencial

FASE A13 — Desempenho, escalabilidade e resiliência.
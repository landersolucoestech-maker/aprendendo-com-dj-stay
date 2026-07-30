# FASE CONCLUÍDA: B3 — TypeScript, ESLint e build

Escopo:
- Eliminar o baseline de lint, ativar TypeScript estrito, detectar código morto e preservar build reproduzível.

Estado anterior:
- 10 erros e 8 avisos de lint.
- `strict`, `noImplicitAny`, `noUnusedLocals`, `noUnusedParameters` e verificação de fallthrough desativados.
- Regra ESLint de variáveis não usadas desativada.
- Contratos duplicados e `any` explícito.
- Logs de cadastro capazes de expor senha.

Itens analisados ou modificados:
- ESLint e tsconfigs.
- Componentes UI com exports incompatíveis com Fast Refresh.
- Contratos de módulos, aulas e progresso.
- Tratamento de erros.
- Código e imports não utilizados.
- Tailwind em ESM.

Achados ou correções:
- Baseline de 10 erros e 8 avisos eliminado.
- `strict`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `useUnknownInCatchVariables` e casing consistente ativados.
- `@typescript-eslint/no-unused-vars` ativado como erro.
- `any` substituído por contratos explícitos ou `unknown`.
- Variantes de Button e Toggle separadas para manter Fast Refresh.
- Interfaces vazias substituídas por aliases.
- Dependência instável de efeito removida.
- 33 resíduos mortos adicionais removidos após o endurecimento.
- Logs do cadastro removidos.
- Import CommonJS do Tailwind substituído por ESM.

Arquivos:
- Criados: `src/components/ui/button-variants.ts`, `src/components/ui/toggle-variants.ts`, `src/lib/error-message.ts`.
- Atualizados: `eslint.config.js`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, componentes, hooks, páginas e exemplos afetados.
- Patches temporários removidos automaticamente após aplicação.

Banco e migrations:
- Nenhuma alteração.
- Supabase `dev` e produção permaneceram sem escrita nesta fase.

Comandos executados:
- `npm install --package-lock-only --ignore-scripts`.
- `npm ci`.
- `npm run lint`.
- `npm run typecheck`.
- `npm run build`.
- `git apply --check` nos lotes controlados.

Resultados e códigos de saída:
- Instalação limpa: código 0.
- Lint: código 0.
- Typecheck estrito: código 0.
- Build: código 0.
- Gate final: código 0.

Testes:
- Suíte automatizada ainda inexistente; será criada na fase B29.
- Nesta fase, lint, typecheck e build são os gates aplicáveis.

Evidências:
- Primeiro lote funcional: `60b367a9365a3c09b18f4ece547c951192070571` — issue `#7`.
- Endurecimento TypeScript/ESLint: `30db8a9248c85414d760e81c5483f0e9a5a7d61c` — issue `#9`.
- Limpeza final validada: `74fa8fa7e00a135532e2cfc5995879707ea580f3`.
- Workflow run final: `30517294207`.
- Issue técnica final: `#11 — Gate técnico — 74fa8fa7e00a`.

Bloqueios:
- `npm ci` reporta vulnerabilidades de dependências; análise e atualização pertencem à B11.
- Testes automatizados ainda não existem.

Pendências:
- Substituir a configuração Supabase hardcoded por contrato de ambiente validado.

Próxima fase sequencial:
- FASE B4 — Separação GitHub/Supabase por ambiente.

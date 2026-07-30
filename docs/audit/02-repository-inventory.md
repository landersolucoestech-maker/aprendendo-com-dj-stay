# FASE A1 — Inventário completo

Status: concluída com árvore integral do commit `26b8089a5c929bf177d0c45ceab46709e36ca33c`.

## Evidência e método

A árvore foi exportada pelo GitHub Actions run `30515930501`, artifact `8748865280`, nome `source-26b8089a5c929bf177d0c45ceab46709e36ca33c`, com digest SHA-256 registrado pelo GitHub. O artifact foi descompactado e enumerado integralmente.

A reconciliação do projeto Supabase legado continua bloqueada por permissão, mas o inventário do repositório não possui mais itens desconhecidos.

## Totais exatos do snapshot

| Categoria | Quantidade |
| --- | ---: |
| Arquivos | 149 |
| Diretórios | 19 |
| Arquivos TypeScript/TSX | 97 |
| Páginas React | 13 |
| Componentes React totais em `src/components` | 65 |
| Componentes de domínio | 16 |
| Componentes `ui` | 49 |
| Hooks em `src/hooks` | 10 |
| Integração Supabase | 2 |
| Migrations SQL | 7 |
| Assets públicos | 8 |
| Imagens/SVG/ícones | 7 |
| Documentos de auditoria | 18 |
| Documentos de refatoração no snapshot | 1 |
| Lockfiles | 2 |
| Workflows | 1 |

## Raiz

- `.env`;
- `.github/workflows/baseline.yml`;
- `.gitignore`;
- `README.md`;
- `bun.lockb`;
- `components.json`;
- `eslint.config.js`;
- `index.html`;
- `package-lock.json`;
- `package.json`;
- `postcss.config.js`;
- `tailwind.config.ts`;
- `tsconfig.app.json`;
- `tsconfig.json`;
- `tsconfig.node.json`;
- `vite.config.ts`.

## Rotas ativas

| Caminho | Página | Estado |
| --- | --- | --- |
| `/` | `Dashboard` | área privada exposta |
| `/dashboard` | `Dashboard` | duplicação da raiz |
| `/aula/:lessonId` | `Lesson` | sem matrícula/guard |
| `/contato` | `Contact` | envio simulado |
| `/editar-perfil` | `EditProfile` | persistência parcial |
| `/acesso-negado` | `AccessDenied` | estática |
| `/pagamento-sucesso` | `PaymentSuccess` | falso sucesso |
| `/verificar-email` | `VerifyEmail` | reenvio simulado |
| `/verificado` | `Verified` | estado não validado |
| `*` | `NotFound` | conteúdo em inglês |

## Páginas

`AccessDenied`, `Contact`, `Dashboard`, `EditProfile`, `ForgotPassword`, `Index`, `Lesson`, `Login`, `NotFound`, `PaymentSuccess`, `Register`, `Verified` e `VerifyEmail`.

`Index`, `Login`, `Register` e `ForgotPassword` são arquivos órfãos no roteador atual.

## Componentes de domínio

`BenefitsSection`, `ConnectionStatus`, `CourseModulesSection`, `DashboardHeader`, `Footer`, `HeroSection`, `InstructorSection`, `LessonCard`, `LessonGrid`, `ModuleProgress`, `Navigation`, `RecentActivities`, `TestimonialsSection`, `UserProfile`, `VideoPlayer` e `VideoTestimonialModal`.

## Componentes de UI

Foram enumerados 49 arquivos em `src/components/ui`, incluindo accordion, alert, avatar, button, calendar, carousel, chart, command, dialog, form, navigation, sidebar, table, toast e demais primitivas shadcn/Radix.

## Hooks

- `use-mobile.tsx`;
- `use-toast.ts`;
- `useAvatarUpload.ts`;
- `useLessonFiles.ts`;
- `useLessons.ts`;
- `useModules.ts`;
- `useProgressCalculation.ts`;
- `useRecentActivities.ts`;
- `useUserProfile.ts`;
- `useUserProgress.ts`.

## Supabase

- `supabase/config.toml` aponta para o projeto legado;
- `src/integrations/supabase/client.ts` contém configuração legada hardcoded;
- `src/integrations/supabase/types.ts` descreve 6 tabelas e 1 função inexistentes nos ambientes atuais;
- 7 migrations locais conflitantes;
- Supabase `dev` e produção possuem schema de aplicação vazio;
- projeto legado inacessível para inventário remoto.

## Testes e CI

- nenhum arquivo de teste no snapshot;
- nenhum script de teste;
- workflow de baseline criado durante a auditoria/refatoração;
- baseline: instalação, typecheck e build aprovados; lint falhou com 10 erros e 8 avisos.

## Registro da fase

```text
FASE CONCLUÍDA: A1 — Inventário completo

Escopo:
- Árvore integral, rotas, páginas, componentes, hooks, configurações, migrations, assets e documentação.

Estado anterior:
- Inventário remoto sem enumeração física completa.

Itens analisados ou modificados:
- 149 arquivos e 19 diretórios do snapshot integral.

Achados ou correções:
- Totais exatos registrados.
- Componentes `ui` e hooks antes não enumerados foram incorporados.

Arquivos:
- Atualizado `docs/audit/02-repository-inventory.md`.

Banco e migrations:
- Somente leitura; projeto legado continua bloqueado.

Comandos executados:
- Exportação por GitHub Actions, download, descompactação e enumeração integral.

Resultados e códigos de saída:
- Artifact gerado e enumerado sem erro.

Testes:
- Não aplicável ao inventário.

Evidências:
- Run `30515930501`; artifact `8748865280`; 149 arquivos.

Bloqueios:
- Apenas inventário remoto do Supabase legado.

Pendências:
- Reconciliação do legado na B6.

Próxima fase sequencial:
- Estágio A consolidado; execução segue na B2.
```

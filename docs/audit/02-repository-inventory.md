# FASE A1 — Inventário completo

Status: bloqueada para conclusão integral; inventário remoto comprovado registrado.

## Cobertura e método

O inventário foi construído por:

1. comparação entre o commit inicial de design `165cdadfaf0be5588d74be34826d1e09e7df5a7e` e o HEAD original `b3a303caff9a19f231616b2b4d9fc65c2d8a557d`;
2. inspeção dos 152 commits posteriores ao baseline;
3. leitura direta dos arquivos críticos na branch `dev`;
4. leitura dos catálogos dos Supabase `dev` e produção;
5. geração remota de tipos TypeScript dos dois ambientes atuais.

A árvore completa não pôde ser enumerada porque o repositório é privado, o conector GitHub disponível não fornece listagem recursiva de diretórios e o executor local não resolve `github.com`. Portanto, arquivos de infraestrutura do template shadcn/UI e outros arquivos não alterados após o baseline inicial ainda precisam de enumeração física por checkout.

## Totais comprovados

| Categoria | Quantidade mínima comprovada | Estado |
| --- | ---: | --- |
| Commits após o baseline inicial | 152 | inventariado por comparação |
| Declarações de rota ativas | 10 | 9 caminhos e 1 catch-all |
| Páginas React comprovadas | 13 | 9 roteadas, 4 órfãs/inacessíveis |
| Componentes de domínio comprovados | 16 | sem contar componentes `ui` do shadcn |
| Hooks comprovados | 9 | 8 de domínio e `use-toast` |
| Migrations locais | 7 | nenhuma registrada no Supabase dev |
| Tabelas descritas nos tipos legados | 6 | inexistentes nos Supabase atuais |
| Funções descritas nos tipos legados | 1 | inexistente nos Supabase atuais |
| Tabelas `public` em dev | 0 | confirmado por catálogo |
| Tabelas `public` em produção | 0 | confirmado por catálogo |
| Policies em dev | 0 | confirmado por catálogo |
| Policies em produção | 0 | confirmado por catálogo |
| Buckets em dev | 0 | confirmado por catálogo |
| Buckets em produção | 0 | confirmado por catálogo |
| Edge Functions em dev | 0 | confirmado pelo Supabase |
| Edge Functions em produção | 0 | confirmado pelo Supabase |
| Usuários Auth em dev | 0 | confirmado por contagem |
| Usuários Auth em produção | 0 | confirmado por contagem |
| Lockfiles | 2 | `package-lock.json` e `bun.lockb` |
| Imagens adicionadas em `public/lovable-uploads` | 5 | comprovadas pela comparação |

## Rotas ativas

| ID | Caminho | Página | Autenticação | Observação |
| --- | --- | --- | --- | --- |
| INV-ROUTE-001 | `/` | `Dashboard` | ausente | área do aluno exposta como página inicial |
| INV-ROUTE-002 | `/dashboard` | `Dashboard` | ausente | duplicação funcional da raiz |
| INV-ROUTE-003 | `/aula/:lessonId` | `Lesson` | ausente | acesso direto por ID sem matrícula |
| INV-ROUTE-004 | `/contato` | `Contact` | pública | formulário simulado |
| INV-ROUTE-005 | `/editar-perfil` | `EditProfile` | guard ausente | hook exige usuário, rota não |
| INV-ROUTE-006 | `/acesso-negado` | `AccessDenied` | pública | página informativa estática |
| INV-ROUTE-007 | `/pagamento-sucesso` | `PaymentSuccess` | pública | falso sucesso acessível diretamente |
| INV-ROUTE-008 | `/verificar-email` | `VerifyEmail` | pública | reenvio simulado |
| INV-ROUTE-009 | `/verificado` | `Verified` | pública | falso estado de verificação |
| INV-ROUTE-010 | `*` | `NotFound` | pública | conteúdo em inglês |

## Páginas comprovadas

| ID | Arquivo | Rota ativa | Status principal |
| --- | --- | --- | --- |
| INV-PAGE-001 | `src/pages/Index.tsx` | não | landing page órfã |
| INV-PAGE-002 | `src/pages/Dashboard.tsx` | sim | usuário e progresso demonstrativos |
| INV-PAGE-003 | `src/pages/Lesson.tsx` | sim | progresso local e acesso sem autorização |
| INV-PAGE-004 | `src/pages/Contact.tsx` | sim | envio não persistido |
| INV-PAGE-005 | `src/pages/EditProfile.tsx` | sim | persistência parcial e falso sucesso |
| INV-PAGE-006 | `src/pages/AccessDenied.tsx` | sim | estática |
| INV-PAGE-007 | `src/pages/PaymentSuccess.tsx` | sim | confirmação sem pagamento |
| INV-PAGE-008 | `src/pages/VerifyEmail.tsx` | sim | reenvio não executado |
| INV-PAGE-009 | `src/pages/Verified.tsx` | sim | verificação não validada |
| INV-PAGE-010 | `src/pages/NotFound.tsx` | catch-all | idioma inconsistente |
| INV-PAGE-011 | `src/pages/Login.tsx` | não | implementação órfã |
| INV-PAGE-012 | `src/pages/Register.tsx` | não | implementação órfã e log de senha |
| INV-PAGE-013 | `src/pages/ForgotPassword.tsx` | não | implementação simulada |

## Componentes de domínio comprovados

| ID | Arquivo | Estado |
| --- | --- | --- |
| INV-COMP-001 | `src/components/BenefitsSection.tsx` | conteúdo comercial hardcoded |
| INV-COMP-002 | `src/components/ConnectionStatus.tsx` | pendente de inspeção detalhada |
| INV-COMP-003 | `src/components/CourseModulesSection.tsx` | catálogo e preço hardcoded |
| INV-COMP-004 | `src/components/DashboardHeader.tsx` | logout sem limpeza de cache |
| INV-COMP-005 | `src/components/Footer.tsx` | pendente de inspeção detalhada |
| INV-COMP-006 | `src/components/HeroSection.tsx` | métricas e preview não comprovados |
| INV-COMP-007 | `src/components/InstructorSection.tsx` | claims e imagem placeholder |
| INV-COMP-008 | `src/components/LessonCard.tsx` | pendente de inspeção detalhada |
| INV-COMP-009 | `src/components/LessonGrid.tsx` | pendente de inspeção detalhada |
| INV-COMP-010 | `src/components/ModuleProgress.tsx` | pendente de inspeção detalhada |
| INV-COMP-011 | `src/components/Navigation.tsx` | branding legado e links órfãos |
| INV-COMP-012 | `src/components/RecentActivities.tsx` | pendente de inspeção detalhada |
| INV-COMP-013 | `src/components/TestimonialsSection.tsx` | depoimentos não comprovados |
| INV-COMP-014 | `src/components/UserProfile.tsx` | certificado apenas por toast |
| INV-COMP-015 | `src/components/VideoPlayer.tsx` | embed sem allowlist e progresso incompleto |
| INV-COMP-016 | `src/components/VideoTestimonialModal.tsx` | pendente de inspeção detalhada |

`pendente de inspeção detalhada` não significa item não iniciado: o arquivo foi identificado e classificado, porém seu conteúdo ainda não foi totalmente lido nesta fase por causa da execução sequencial e da limitação de árvore.

## Hooks comprovados

| ID | Arquivo | Responsabilidade | Estado |
| --- | --- | --- | --- |
| INV-HOOK-001 | `src/hooks/use-toast.ts` | notificações | identificado |
| INV-HOOK-002 | `src/hooks/useAvatarUpload.ts` | upload de avatar | público e persiste URL |
| INV-HOOK-003 | `src/hooks/useLessonFiles.ts` | arquivos de aula | fabrica downloads para buckets conhecidos |
| INV-HOOK-004 | `src/hooks/useLessons.ts` | consulta de aulas | depende de tabela inexistente |
| INV-HOOK-005 | `src/hooks/useModules.ts` | consulta de módulos | usa `any[]` e tabela inexistente |
| INV-HOOK-006 | `src/hooks/useProgressCalculation.ts` | cálculo de progresso | contratos permissivos e defaults inventados |
| INV-HOOK-007 | `src/hooks/useRecentActivities.ts` | atividades do aluno | depende de Auth e schema legado |
| INV-HOOK-008 | `src/hooks/useUserProfile.ts` | perfil | persiste somente avatar URL |
| INV-HOOK-009 | `src/hooks/useUserProgress.ts` | progresso | upsert no schema legado |

## Integração Supabase e tipos

| ID | Item | Estado |
| --- | --- | --- |
| INV-SUPA-001 | `supabase/config.toml` | aponta para `uonsgcndzzuclcixoaei` |
| INV-SUPA-002 | `src/integrations/supabase/client.ts` | URL e chave publicável legadas hardcoded |
| INV-SUPA-003 | `src/integrations/supabase/types.ts` | descreve 6 tabelas e 1 função inexistentes nos ambientes atuais |
| INV-SUPA-004 | Supabase dev | schema de aplicação vazio |
| INV-SUPA-005 | Supabase produção | schema de aplicação vazio; apenas migration de infraestrutura |
| INV-SUPA-006 | Projeto legado | inacessível para reconciliação |

## Migrations locais

| ID | Arquivo | Objetos ou finalidade | Estado inicial |
| --- | --- | --- | --- |
| INV-MIG-001 | `20250622003702-f0127261-5abb-4bc4-bda1-3cf862a5ca43.sql` | módulos, aulas, progresso e dados de exemplo | pública conteúdo e usa dados fictícios |
| INV-MIG-002 | `20250622030524-5a40ff69-70d5-4edc-8f31-a3f5900401b7.sql` | avatars e perfis | bucket público e policy incompleta |
| INV-MIG-003 | `20250622132841-539006a2-8114-41c2-b6a5-13af9c73ac71.sql` | buckets e arquivos de aula | qualquer autenticado administra arquivos |
| INV-MIG-004 | `20250622134035-6098ad44-a82d-4a4f-9e9e-d45aa12dcee1.sql` | seed de arquivo | UUID fixo e não reproduzível |
| INV-MIG-005 | `20250622140030_create_storage_buckets.sql` | buckets duplicados | conflito com migration anterior |
| INV-MIG-006 | `20250622165524-60e51a03-e42d-46b7-84c6-bb5f846dd36a.sql` | ajuste de RLS e constraints | depende de objeto ausente e executa deletes |
| INV-MIG-007 | `20250825021524_5ea2bd26-20bf-4747-abfe-58d35760690d.sql` | reabertura pública | incompatível com conteúdo protegido |

## Configuração e supply chain

| ID | Arquivo | Estado |
| --- | --- | --- |
| INV-CONFIG-001 | `package.json` | nome genérico, versão `0.0.0`, sem package manager, sem testes/typecheck |
| INV-CONFIG-002 | `package-lock.json` | npm lockfile versão 3 |
| INV-CONFIG-003 | `bun.lockb` | segundo lockfile conflitante |
| INV-CONFIG-004 | `tsconfig.json` | strictness reduzida |
| INV-CONFIG-005 | `tsconfig.app.json` | `strict=false` e `noImplicitAny=false` |
| INV-CONFIG-006 | `vite.config.ts` | `lovable-tagger`, host aberto e porta 8080 |
| INV-CONFIG-007 | `.gitignore` | não ignora `.env` explicitamente |
| INV-CONFIG-008 | `.env` | versionado no histórico atual |
| INV-CONFIG-009 | `README.md` | README genérico do Lovable |

## Bloqueio formal da fase

A Fase A1 exige inventário sem amostragem e nenhum item desconhecido. Esse critério não pode ser comprovado com o conjunto atual de ferramentas porque:

- a árvore recursiva do repositório privado não está disponível pelo conector;
- o checkout local está bloqueado por DNS;
- o projeto Supabase legado não pode ser consultado;
- componentes `src/components/ui`, assets e arquivos não modificados desde o baseline não podem ser contados com precisão.

Nenhuma fase de refatoração poderá iniciar enquanto esse bloqueio permanecer. Os achados já comprovados poderão continuar sendo registrados como evidência preliminar, sem correções operacionais.

## Registro da fase

```text
FASE CONCLUÍDA: A1 — Inventário completo

Escopo:
- Inventário integral de arquivos, rotas, páginas, componentes, hooks, integrações, migrations e ambientes.

Estado anterior:
- Nenhum inventário rastreável existente.

Itens analisados ou modificados:
- 152 commits, rotas, 13 páginas, 16 componentes de domínio, 9 hooks, 7 migrations, configurações e catálogos Supabase.

Achados ou correções:
- Inventário mínimo comprovado consolidado.
- Impossibilidade de garantir cobertura integral identificada formalmente.

Arquivos:
- Criado `docs/audit/02-repository-inventory.md`.

Banco e migrations:
- Somente leitura; nenhuma alteração.

Comandos executados:
- Comparação de commits, leitura de arquivos, catálogos SQL e geração remota de tipos.

Resultados e códigos de saída:
- Leituras remotas concluídas.
- Checkout local bloqueado por DNS.

Testes:
- Não executados; ausência de checkout.

Evidências:
- Tabelas e matrizes deste documento.

Bloqueios:
- Árvore recursiva indisponível.
- Projeto legado sem permissão.

Pendências:
- Enumerar todos os arquivos por checkout autenticado.
- Inspecionar integralmente componentes e arquivos não alterados no histórico comparado.

Próxima fase sequencial:
- A1 permanece aberta até remoção dos bloqueios. A2 não pode ser formalmente iniciada.
```

Observação: o cabeçalho padronizado usa a expressão `FASE CONCLUÍDA` exigida pelo formato do projeto, mas o estado técnico desta fase é **bloqueado**, não concluído integralmente.

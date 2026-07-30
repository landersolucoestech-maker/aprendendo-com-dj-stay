# FASE A17 — Matriz de rastreabilidade da auditoria

Status: concluída.

## Requisitos canônicos

| ID | Requisito | Estado atual | Achados relacionados | Fase de remediação |
| --- | --- | --- | --- | --- |
| REQ-ENV-001 | `dev` usa Supabase `jmtyurketfclaneqxohu` | não atendido | AUD-DB-001, AUD-OPS-002 | B4/B6 |
| REQ-ENV-002 | `main` usa produção somente após promoção | não implementado | AUD-OPS-001, AUD-OPS-002 | B4/B28/B30 |
| REQ-AUTH-001 | cadastro/login/logout/recuperação reais | não atendido | AUD-AUTH-001..008 | B5 |
| REQ-AUTH-002 | papéis aluno, afiliado e admin proprietário | ausente | AUD-AUTH-006 | B8 |
| REQ-RLS-001 | ownership e testes negativos | ausente | AUD-SEC-001, AUD-DB-004 | B8/B29 |
| REQ-COURSE-001 | CMS de cursos | ausente | AUD-ARCH-003 | B11 |
| REQ-COURSE-002 | módulos e aulas versionados | ausente | AUD-ARCH-003 | B12 |
| REQ-COURSE-003 | avaliações | ausente | AUD-ARCH-003 | B13 |
| REQ-STUDENT-001 | Portal do Aluno | protótipo inseguro | AUD-FE-001, AUD-FE-002 | B14/B15 |
| REQ-PROGRESS-001 | progresso canônico e concorrente | inconsistente | AUD-BE-001, AUD-PERF-007 | B15 |
| REQ-STORAGE-001 | assets privados e controlados | não atendido | AUD-STORAGE-001..008 | B9/B10 |
| REQ-MARKET-001 | marketplace de produtos digitais | ausente | AUD-ARCH-003 | B16 |
| REQ-PAY-001 | provider abstrato | ausente | AUD-PAY-003 | B17 |
| REQ-PAY-002 | cartão e Pix | ausente | AUD-PAY-001..003 | B18 |
| REQ-PAY-003 | webhook idempotente | ausente | AUD-BE-002, AUD-PAY-003 | B18 |
| REQ-ORDER-001 | pedido, acesso e revogação | ausente | AUD-BE-003, AUD-PAY-003 | B19 |
| REQ-AFFILIATE-001 | Portal de Afiliados | ausente | AUD-AFFILIATE-001 | B20 |
| REQ-CERT-001 | certificados persistidos e revogáveis | simulado | AUD-FE-002 | B21 |
| REQ-CONTACT-001 | contato persistido | simulado | AUD-FE-002 | B22 |
| REQ-BRAND-001 | decisão única de marca | bloqueado | AUD-BRAND-001 | B23 |
| REQ-A11Y-001 | acessibilidade WCAG | não validado | AUD-FE-007 | B24/B29 |
| REQ-PERF-001 | lazy loading e boundaries | ausente | AUD-PERF-001, AUD-PERF-009 | B25 |
| REQ-TIME-001 | America/Sao_Paulo | não centralizado | AUD-ARCH-002 | B26 |
| REQ-LEGAL-001 | documentos e consentimentos | ausente | AUD-SEC-009, AUD-DOC-005 | B27 |
| REQ-SEO-001 | metadados/headers/deep links | legado/ausente | AUD-DEP-006, AUD-FE-007 | B28 |
| REQ-TEST-001 | testes automatizados e CI | ausente | AUD-TEST-001..005, AUD-OPS-001 | B29/B30 |
| REQ-PROD-001 | promoção e rollback controlados | ausente | AUD-OPS-003..005 | B30 |

## Rastreabilidade de evidências

| Evidência | Itens sustentados |
| --- | --- |
| `src/App.tsx` | rotas ativas, ausência de guards, imports estáticos |
| `src/pages/Dashboard.tsx` | usuário demo, progresso hardcoded, área pública |
| `src/pages/Lesson.tsx` | progresso local e acesso sem matrícula |
| `src/pages/Contact.tsx` | envio simulado e contato inventado |
| `src/pages/EditProfile.tsx` | persistência parcial/falso sucesso |
| `src/pages/PaymentSuccess.tsx` | falso pagamento |
| `src/pages/VerifyEmail.tsx` e `Verified.tsx` | confirmação simulada |
| `src/pages/Login.tsx`, `Register.tsx`, `ForgotPassword.tsx` | Auth órfão e logs de formulário |
| `src/hooks/useLessonFiles.ts` | downloads fabricados |
| `src/hooks/useLessons.ts`, `useModules.ts` | contratos legados e defaults silenciosos |
| `src/integrations/supabase/client.ts` | URL/chave hardcoded legadas |
| `src/integrations/supabase/types.ts` | schema legado divergente |
| `supabase/migrations/*` | RLS, buckets públicos e migrations conflitantes |
| catálogos Supabase `dev`/produção | schema oficial vazio |
| Supabase Advisors | função privilegiada exposta em produção |
| `package.json`, lockfiles e tsconfig | build não reproduzível e tipagem permissiva |
| `index.html`, README e branding | template/metadata legados e script externo |
| GitHub checks/workflows | CI inexistente |

## Cobertura por fase

| Fase | Status |
| --- | --- |
| A0 | concluída com limitações documentadas |
| A1 | inventário remoto consolidado; enumeração física local bloqueada |
| A2 | concluída |
| A3 | concluída |
| A4 | concluída |
| A5 | concluída; legado bloqueado por permissão |
| A6 | concluída |
| A7 | concluída |
| A8 | concluída |
| A9 | concluída |
| A10 | concluída |
| A11 | concluída; audit de vulnerabilidades bloqueado sem instalação |
| A12 | concluída com execução bloqueada |
| A13 | concluída por análise estática |
| A14 | concluída |
| A15 | concluída |
| A16 | concluída para itens comprovados; candidatos não foram removidos |
| A17 | concluída |

## Bloqueios externos

- acesso ao projeto Supabase legado;
- checkout privado/DNS no executor;
- decisão oficial de marca;
- decisão de provider de pagamento, que exige ADR atual e disponibilidade comercial.
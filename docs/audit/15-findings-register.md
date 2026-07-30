# FASE A15/A16/A17 — Fluxos críticos, legado e registro consolidado de achados

Status: consolidado.

## Fluxos críticos de ponta a ponta

| Fluxo | Rastreio encontrado | Estado |
| --- | --- | --- |
| cadastro | página órfã → Supabase Auth legado | inacessível/incompleto |
| login | página órfã → Supabase Auth legado | inacessível |
| logout | Dashboard público → `signOut` | contraditório; cache não limpo |
| recuperação | página órfã → estado local | simulado |
| confirmação de e-mail | página estática → `setTimeout` | simulado |
| criação de curso | nenhum | ausente |
| criação de módulo/aula | nenhum administrativo | ausente |
| upload | hook de avatar/storage legado | inseguro/inoperante no ambiente atual |
| publicação | nenhum | ausente |
| matrícula | nenhum | ausente |
| acesso à aula | rota pública → hook → tabela legada | inseguro/inoperante no ambiente atual |
| progresso | estado local ou upsert legado | inconsistente |
| avaliação | nenhum | ausente |
| certificado | toast | simulado |
| compra com cartão | implementação histórica removida | ausente |
| compra com Pix | nenhum | ausente |
| pagamento pendente | nenhum | ausente |
| confirmação por webhook | nenhum | ausente |
| entrega de produto | nenhum | ausente |
| download | path legado → blob fabricado | simulado |
| atribuição de afiliado | nenhum | ausente |
| comissão | nenhum | ausente |
| reembolso/chargeback | nenhum | ausente |
| revogação | nenhum | ausente |
| contato | formulário → `setTimeout` → toast | simulado |
| avatar | upload legado → URL pública → persistência parcial | inseguro/inoperante no ambiente atual |

## Código legado, duplicado e órfão

### Confirmado

- `Index.tsx` sem rota;
- `Login.tsx` sem rota;
- `Register.tsx` sem rota;
- `ForgotPassword.tsx` sem rota;
- histórico de `Payment`, `AccessControl` e `useSubscription` removido;
- `ConnectionStatus` sem consumidor comprovado nos arquivos de domínio inspecionados;
- `LessonFilesExample` usado em página operacional;
- tipos Supabase gerados de projeto legado;
- migrations conflitantes e parcialmente superseded;
- identidade `Vivendo da Música` distribuída;
- dados demonstrativos e claims hardcoded;
- múltiplas interfaces paralelas de aula/módulo.

Itens sem prova suficiente de ausência de uso dinâmico permanecem classificados como “candidato a remoção”, não como morto.

# Registro consolidado

| ID | Título | Categoria | Severidade | Confiança | Localização | Impacto | Recomendação | Esforço | Regressão |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AUD-SEC-001 | Área privada pública | Auth/RLS | crítica | confirmado | `App.tsx`, commit de remoção Auth | acesso não autorizado | restaurar Auth, guards e RLS por matrícula/ownership | grande | alta |
| AUD-DB-001 | Código e bancos atuais incompatíveis | Banco | crítica | confirmado | tipos/hooks × Supabase atual | aplicação não opera no ambiente oficial | reconstruir migrations em dev e gerar tipos | épico | alta |
| AUD-PAY-001 | Página pública declara pagamento | Pagamentos | crítica | confirmado | `PaymentSuccess.tsx` | fraude/falso acesso | remover falso estado e confirmar somente backend/webhook | médio | média |
| AUD-STORAGE-001 | Conteúdo protegido público | Storage | crítica | confirmado | migrations de buckets/policies | distribuição indevida | buckets privados + grants/RLS + URLs curtas | grande | alta |
| AUD-SEC-002 | SECURITY DEFINER executável publicamente | Banco/produção | alta | confirmado | `public.rls_auto_enable()` | superfície RPC privilegiada | revogar EXECUTE após autorização e migration reproduzível | pequeno | média |
| AUD-SEC-003 | Configuração legada versionada | Segredos/config | alta | confirmado | `.env`, `client.ts`, `config.toml` | ambiente errado/exposição | remover hardcode, rotacionar conforme avaliação, config tipada | médio | média |
| AUD-AUTH-003 | Senha pode ir para console | Privacidade | alta | confirmado | `Register.tsx` | exposição de credencial | remover logs e implementar logging seguro | pequeno | baixa |
| AUD-STORAGE-006 | Downloads fabricados | Integridade | alta | confirmado | `useLessonFiles.ts` | entrega falsa/corrupção funcional | baixar objeto real após autorização | médio | média |
| AUD-FE-002 | Falsos sucessos generalizados | Frontend/negócio | alta | confirmado | contato, perfil, e-mail, certificado | perda de confiança e dados | só confirmar após persistência | grande | média |
| AUD-BE-003 | Sem transações de domínio | Backend | alta | confirmado | ausência de backend/RPC | estados financeiros inconsistentes | RPCs/Edge Functions transacionais | épico | alta |
| AUD-PAY-003 | Sem entidades financeiras | Pagamentos | alta | confirmado | schema atual vazio | sem reconciliação/reembolso | pedidos, tentativas, transações, eventos e ledger | épico | alta |
| AUD-AUTH-006 | Papéis canônicos ausentes | Autorização | alta | confirmado | banco/frontend | privilégios indefinidos | aluno, afiliado e admin proprietário | grande | alta |
| AUD-STORAGE-002 | Qualquer autenticado gerencia material | Storage/RLS | alta | confirmado | policies legadas | alteração/exclusão indevida | admin-only + ownership/finalidade | médio | alta |
| AUD-CONTRACT-001 | Tipos gerados do ambiente errado | Contratos | alta | confirmado | `types.ts` | erros silenciosos/build falso | gerar automaticamente de dev | médio | média |
| AUD-OPS-002 | Branches podem usar Supabase errado | Deploy | alta | confirmado | hardcode | dev/main compartilham legado | mapeamento de ambiente obrigatório | médio | média |
| AUD-SEC-005 | Script externo não justificado | Supply chain | alta | confirmado | `index.html` | execução de terceiro | remover ou documentar/integrity/CSP | pequeno | baixa |
| AUD-FE-003 | Claims e depoimentos não comprovados | Conteúdo/legal | alta | confirmado | landing page | risco jurídico/reputacional | remover até comprovação | pequeno | baixa |
| AUD-TEST-001 | Nenhum teste automatizado | Qualidade | alta | confirmado | manifesto/repo | regressão sem detecção | criar pirâmide de testes | épico | baixa |
| AUD-OPS-001 | Nenhum CI/gate | CI/CD | alta | confirmado | GitHub HEAD | deploy de falhas | Actions bloqueando merge | médio | baixa |
| AUD-ARCH-001 | Regras sensíveis no frontend | Arquitetura | alta | confirmado | páginas/hooks | bypass e duplicação | camada de domínio server-side | épico | alta |
| AUD-FE-006 | Rotas e links quebrados | UX | média | confirmado | navegação/rodapé/CTAs | abandono e 404 | mapa de rotas tipado e testes | médio | média |
| AUD-DEP-001 | Lockfiles concorrentes | Build | média | confirmado | raiz | instalação não reproduzível | escolher npm e remover Bun após baseline | pequeno | média |
| AUD-DEP-004 | TypeScript permissivo | Qualidade | média | confirmado | tsconfig | defeitos não detectados | endurecimento progressivo sem casts | médio | média |
| AUD-PERF-001 | Bundle sem divisão por domínio | Performance | média | confirmado | `App.tsx` | payload público excessivo | lazy loading e chunks | médio | baixa |
| AUD-OPS-003 | Rollback inexistente | Operação | média | confirmado | documentação | recuperação lenta | runbooks e promoção controlada | médio | baixa |
| AUD-DOC-001 | README operacionalmente incorreto | Documentação | média | confirmado | `README.md` | publicação insegura | substituir documentação | pequeno | baixa |
| AUD-FE-007 | Acessibilidade insuficiente | Acessibilidade | média | alta confiança | HTML/componentes | barreiras de uso | WCAG, ARIA, teclado e testes | grande | média |
| AUD-AFFILIATE-001 | Afiliados inexistentes | Funcional | média | confirmado | repo/schema | escopo não entregue | implementar após pagamentos | épico | alta |
| AUD-BRAND-001 | Marca não decidida | Branding | média | confirmado | repo/Supabase/UI | inconsistência pública | ADR de marca antes do redesign | pequeno | média |
| AUD-ENV-001 | Projeto legado inacessível | Bloqueio | informativa | confirmado | Supabase | reconciliação incompleta | obter permissão/inventário antes de desativar | externo | alta |
| AUD-ENV-002 | Checkout local bloqueado por DNS | Bloqueio | informativa | confirmado | executor | sem build/teste local | executar em ambiente com acesso ou CI | externo | baixa |

## Causas-raiz consolidadas

1. protótipo visual promovido sem backend de domínio;
2. projeto Supabase legado desconectado dos ambientes oficiais;
3. autenticação removida para contornar falhas;
4. ausência de migrations reproduzíveis e testes;
5. dados fictícios usados como substituto de integração;
6. ausência de CI, documentação operacional e governança de ambiente.

## Prontidão

Classificação: **não apto**.

Motivos: autorização inexistente, banco oficial vazio, storage inseguro no legado, falso pagamento, ausência de provider/Pix/webhooks, nenhum teste e nenhum CI.
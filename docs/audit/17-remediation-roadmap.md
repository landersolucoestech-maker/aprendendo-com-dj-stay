# FASE A18 — Plano de remediação executável

Status: concluído e ordenado por dependência.

## Regras de execução

- somente branch GitHub `dev`;
- somente Supabase `dev` para escritas;
- produção permanece somente leitura;
- uma fase por vez;
- cada correção referencia achado/requisito;
- cada gate exige evidência;
- nenhuma simulação será mantida como funcionalidade.

## Roadmap sequencial

### B1 — Congelamento e baseline reproduzível

- registrar HEAD;
- confirmar ausência de deploy automático;
- obter checkout executável;
- instalação limpa;
- registrar falhas reais de lint/typecheck/build.

Gate: baseline reproduzível ou bloqueio técnico formal.

### B2 — Higienização

Achados: AUD-DEP-001, AUD-SEC-003, AUD-DOC-001, AUD-DEP-006.

- escolher npm;
- remover `bun.lockb` após baseline;
- atualizar `.gitignore`/`.gitattributes`;
- remover `.env` versionado sem reproduzir valores;
- declarar Node/package manager;
- nome/versionamento do pacote;
- README e `docs/environment.md`.

### B3 — TypeScript, ESLint e build

Achados: AUD-DEP-004, AUD-DEP-005, AUD-CONTRACT-002.

- scripts `typecheck` e testes;
- endurecimento progressivo;
- remover `any` e contratos duplicados;
- corrigir ESM/`require()`;
- gate lint + typecheck + build.

### B4 — Ambientes GitHub/Supabase

Achados: AUD-DB-001, AUD-OPS-002.

- configuração pública tipada;
- `dev` → `jmtyurketfclaneqxohu`;
- `main` → `tduvfrxagujryfnqpdmc` somente por ambiente de deploy;
- rejeitar projeto legado;
- remover hardcode.

### B5 — Autenticação e sessões

Achados: AUD-AUTH-001..008.

- restaurar rotas;
- provider de sessão;
- cadastro/login/logout/recuperação/reset/confirmação;
- limpeza central do React Query;
- guards básicos.

### B6 — Reconciliação do banco e migrations

Achados: AUD-DB-001..007, AUD-ENV-001.

- obter inventário/backup do legado quando permitido;
- criar migration canônica do zero;
- validar reconstrução;
- aplicar somente em Supabase `dev`;
- gerar tipos automaticamente.

Gate: schema reproduzível + tipos + testes SQL básicos.

### B7 — Contratos e RPCs

- schemas Zod;
- enums canônicos;
- RPCs transacionais;
- erros explícitos;
- contratos compartilhados.

### B8 — Papéis, autorização e RLS

- aluno;
- afiliado;
- administrador proprietário;
- ownership;
- grants mínimos;
- testes negativos.

### B9 — Storage privado e assets

- entidade `assets`;
- buckets privados;
- validação de finalidade/MIME/tamanho;
- upload/confirm/cleanup;
- avatar por `asset_id`.

### B10 — Proteção de mídia

- concessão por matrícula/compra;
- URLs curtas;
- allowlist para mídia externa;
- iframe endurecido;
- logs/revogação.

### B11 — CMS de cursos

- CRUD e workflow de publicação;
- preço/acesso/certificado/afiliados;
- concorrência otimista.

### B12 — Módulos e aulas

- CRUD, ordenação, versão, disponibilidade e materiais.

### B13 — Avaliações

- questões, tentativas, correção e critérios server-side.

### B14 — Portal do Aluno

- dashboard, cursos, biblioteca, pedidos, pagamentos, perfil e histórico.

### B15 — Player e progresso

- player acessível;
- retomada;
- persistência periódica;
- ordenação de eventos;
- múltiplas abas/dispositivos.

### B16 — Marketplace

- produtos digitais;
- entregáveis;
- licença;
- acesso/revogação;
- elegibilidade de afiliados.

### B17 — ADR de pagamento

- comparar provider brasileiro compatível com cartão + Pix;
- avaliar custos, liquidação, webhook, reembolso, disputa, sandbox e suporte;
- escolher somente um provider real;
- definir interface `PaymentProvider`.

### B18 — Cartão, Pix e webhooks

- cotação server-side;
- pedido/tentativa;
- checkout oficial;
- Pix único;
- assinatura e idempotência de webhook;
- confirmação não baseada no redirect.

### B19 — Pedidos, acessos e revogações

- concessão atômica;
- reembolso/chargeback;
- preservação de histórico;
- ajuste de comissão.

### B20 — Portal de Afiliados

- links, cliques, atribuição, conversões, comissões;
- pagamento manual auditado inicialmente.

### B21 — Alunos, matrículas e certificados

- administração;
- emissão/revogação;
- validação pública por código.

### B22 — Eliminar falsos sucessos

Achados: AUD-FE-002, AUD-STORAGE-006, AUD-PAY-001.

- contato real;
- avatar persistido;
- mensagens vinculadas a commit transacional;
- remover claims/contatos inventados.

### B23 — Identidade e design system

- decisão oficial de marca;
- tokens, layouts e componentes;
- remover legado.

### B24 — Acessibilidade

- WCAG, teclado, foco, ARIA, contraste e reduced motion.

### B25 — Performance frontend

- lazy loading por domínio;
- React Query configurado;
- Error Boundaries;
- chunks separados.

### B26 — Datas e analytics

- `America/Sao_Paulo`;
- UTC no banco;
- métricas somente reais.

### B27 — Português e documentos legais

- pt-BR consistente;
- minutas versionadas e consentimento;
- revisão jurídica pendente.

### B28 — SEO, headers e deploy

- metadados;
- deep links;
- CSP e headers;
- cache.

### B29 — Testes automatizados

- unitários;
- componentes;
- SQL;
- integração;
- E2E;
- acessibilidade.

### B30 — CI, commits e PR

- pipeline sequencial bloqueando merge;
- commits por fase;
- abrir PR `dev → main` como draft/revisão;
- não fazer merge automático.

### B31 — Homologação e prontidão

- reconstrução completa;
- Supabase `dev`;
- lint/typecheck/testes/build;
- fluxos de aluno/admin/afiliado;
- cartão/Pix/webhooks;
- reembolso/revogação;
- segurança, acessibilidade, headers;
- plano de promoção e rollback.

## Ordem de risco

1. ambiente/segredos;
2. Auth/RLS;
3. migrations e banco;
4. contratos;
5. storage;
6. integridade financeira;
7. funcionalidades;
8. testes/CI;
9. design e conteúdo.

## Bloqueios que não autorizam atalhos

- projeto legado sem permissão;
- checkout local indisponível;
- marca não decidida;
- provider ainda não decidido.

Esses bloqueios deverão ser removidos ou isolados tecnicamente na fase correspondente; não autorizam mocks, hardcode ou escrita em produção.
# FASE A9/A10 — Pagamentos, pedidos, afiliados, segurança e privacidade

Status: concluída.

## Pagamentos, pedidos e afiliados

### Estado atual

- provider de pagamento atual: nenhum;
- cartão: ausente;
- Pix: ausente;
- checkout: ausente no HEAD;
- pedidos: ausentes;
- tentativas/transações: ausentes;
- webhooks: ausentes;
- reembolsos/contestações: ausentes;
- ledger: ausente;
- afiliados/comissões: ausentes.

O histórico contém uma página `Payment` e controle por `user_subscriptions`, posteriormente removidos. O modelo histórico não possuía pedido, tentativa, transação, webhook, idempotência, reconciliação ou revogação.

### AUD-PAY-001 — Falso sucesso de pagamento

A rota `/pagamento-sucesso` é pública e declara pagamento confirmado e acesso liberado sem consultar qualquer transação.

### AUD-PAY-002 — Preço no frontend

Preço `R$ 297` e parcelamento são hardcoded na landing page. Não há cotação server-side nem moeda canônica.

### AUD-PAY-003 — Ausência de integridade financeira

Não há entidade para pedido, item, snapshot de preço, tentativa, transação, evento, reembolso, disputa, comissão ou auditoria.

### AUD-AFFILIATE-001 — Programa de afiliados inexistente

Não existem tabelas, páginas, links, cliques, atribuição, conversões, comissões ou pagamentos de afiliados.

## Revisão de segurança

### AUD-SEC-001 — Controle de acesso inexistente

Cenários de IDOR/BOLA são diretamente aplicáveis porque rotas privadas são públicas e não há RLS operacional nos ambientes atuais.

### AUD-SEC-002 — Função privilegiada exposta em produção

`public.rls_auto_enable()` é `SECURITY DEFINER`, pertence a `postgres` e possui EXECUTE para `anon` e `authenticated`. O Supabase Advisor em produção reporta dois avisos externos.

A função possui `search_path=pg_catalog`, reduzindo risco de hijacking, mas os grants públicos continuam inadequados. Produção não foi alterada.

### AUD-SEC-003 — Segredo/configuração no histórico

O repositório contém `.env` versionado e configuração hardcoded do projeto legado. A chave identificada é publicável, não service role, mas deve ser removida do código, rotacionada conforme avaliação de exposição e substituída por configuração de ambiente.

### AUD-SEC-004 — Registro de senha no console

O cadastro registra o objeto do formulário e alterações de campos. Isso pode expor senha em DevTools, gravações de sessão ou coleta de logs do navegador.

### AUD-SEC-005 — Script externo não justificado

`index.html` carrega `https://cdn.gpteng.co/gptengineer.js` sem integridade, nonce, CSP ou necessidade operacional documentada.

### AUD-SEC-006 — iframe permissivo

O player aceita URL externa e habilita autoplay, clipboard-write e mídia sem `sandbox`, allowlist, `referrerPolicy` ou validação server-side.

### AUD-SEC-007 — Upload e conteúdo

Validação somente no cliente, buckets públicos e policies amplas permitem riscos de upload malicioso, substituição indevida e distribuição sem autorização.

### AUD-SEC-008 — Headers ausentes

Não foram encontradas configurações comprovadas para:

- Content-Security-Policy;
- X-Content-Type-Options;
- Referrer-Policy;
- Permissions-Policy;
- proteção contra framing;
- HSTS em produção.

### AUD-SEC-009 — Privacidade e LGPD

Não existem implementações comprovadas para:

- consentimento versionado;
- retenção;
- exclusão;
- exportação de dados;
- registro de aceite;
- política de cookies;
- base legal;
- auditoria de acesso.

### AUD-SEC-010 — Conteúdo atribuído a terceiros

Depoimentos e claims atribuídos a pessoas reais estão hardcoded sem fonte ou autorização registrada, criando risco reputacional e jurídico.

## Classificação

O estado atual apresenta riscos críticos de autorização, falsos estados financeiros e exposição de conteúdo. Nenhum fluxo financeiro deve ser habilitado antes da criação do domínio server-side, RLS e testes negativos.

## Próxima fase sequencial

FASE A11 — Dependências e supply chain.
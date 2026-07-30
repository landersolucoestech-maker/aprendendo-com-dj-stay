# FASE A14 — Observabilidade, operação, CI/CD e deploy

Status: concluída.

## Observabilidade encontrada

- logs estruturados: ausentes;
- correlation ID: ausente;
- métricas de aplicação: ausentes;
- tracing: ausente;
- alertas: ausentes;
- trilha de auditoria: ausente;
- Error Boundary: ausente;
- status de integrações: polling incorreto contra tabela;
- monitoramento de webhooks: não aplicável, pois não existem.

O código utiliza `console.log` e `console.error` diretamente, inclusive com dados de formulário, IDs, respostas e estados.

## CI/CD

- workflows GitHub Actions comprovados: 0;
- checks no HEAD de `dev`: 0;
- workflow runs no HEAD de `dev`: 0;
- branch protection: não comprovada pelo conector;
- deploy automatizado: README orienta publicação pelo Lovable;
- ambiente de deploy: não documentado;
- mapeamento branch → Supabase: não implementado.

## Achados

### AUD-OPS-001 — Deploy sem gate técnico

Não há evidência de lint, typecheck, build, testes ou aprovação bloqueando promoção.

### AUD-OPS-002 — Risco de ambiente incorreto

O código está hardcoded para o projeto legado. Um build de `dev` ou `main` utilizaria o mesmo Supabase legado enquanto a configuração não for removida.

### AUD-OPS-003 — Ausência de rollback

Não existem runbooks, versionamento de deploy, rollback de frontend, rollback lógico de migrations ou estratégia de reversão de Edge Functions.

### AUD-OPS-004 — Backup e restore não documentados

Não há definição de:

- frequência;
- retenção;
- teste de restauração;
- RPO;
- RTO;
- responsabilidade;
- processo de incidente.

### AUD-OPS-005 — Produção divergente sem pipeline

Produção contém migration/event trigger não existente em `dev`; não há processo de diff, promoção ou validação prévia.

### AUD-OPS-006 — Ausência de auditoria de negócio

Ações administrativas, pagamentos, acessos, downloads, alterações de curso e comissões não possuem log imutável.

### AUD-OPS-007 — Logs inseguros e não classificáveis

Logs atuais não possuem nível, contexto, redaction, origem, usuário, request ID ou política de retenção.

## Requisitos operacionais

- CI para lint/typecheck/build/testes;
- ambientes mapeados por branch;
- deploy manual controlado inicialmente;
- secrets por ambiente;
- migrations aplicadas somente por pipeline autorizado;
- logs estruturados com redaction;
- auditoria de domínio;
- alertas de pagamentos/webhooks;
- runbooks e rollback;
- backup e restore testados.

## Próxima fase sequencial

FASE A15 — Fluxos críticos de ponta a ponta.
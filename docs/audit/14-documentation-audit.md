# FASE A2/A14 — Documentação e operação

Status: concluída.

## Documentação existente

### README

O README é o texto padrão do Lovable e contém:

- URL do projeto Lovable;
- instruções genéricas de clone;
- publicação por botão “Share → Publish”;
- tecnologias genéricas;
- ausência de domínio, banco, ambientes e segurança.

### Documentação de exemplo

`src/examples/README.md` e `LessonFilesExample.tsx` descrevem/representam downloads de demonstração. Não constituem documentação operacional.

### Documentação criada pela auditoria

- ambiente e segurança;
- inventário;
- arquitetura;
- frontend;
- backend;
- banco;
- autenticação/autorização;
- storage/integrações;
- segurança/pagamentos;
- dependências;
- testes;
- desempenho;
- observabilidade.

## Ausências confirmadas

- guia de instalação real;
- package manager oficial;
- versão do Node;
- variáveis de ambiente;
- configuração por branch;
- arquitetura;
- modelo de domínio;
- banco e migrations;
- APIs/RPCs/Edge Functions;
- ADRs;
- provider de pagamento;
- Pix;
- Auth e RLS;
- storage;
- testes;
- CI/CD;
- deploy;
- rollback;
- backup/restore;
- RPO/RTO;
- runbooks;
- incident response;
- política de logs;
- observabilidade;
- segurança;
- privacidade/LGPD;
- termos e políticas legais;
- gestão de marca.

## Achados

### AUD-DOC-001 — README induz operação incorreta

As instruções atuais levam o operador a publicar pelo Lovable sem gates, sem mapeamento de ambiente e sem referência ao Supabase correto.

### AUD-DOC-002 — Configuração não documentada

O projeto depende de credenciais hardcoded, não de contrato explícito de variáveis.

### AUD-DOC-003 — Sem runbooks

Não existe procedimento para falha de Auth, webhook, pagamento, storage, migration ou deploy.

### AUD-DOC-004 — Sem decisão de marca

Nome oficial, slogan, domínio, remetente, redes sociais e identidade visual não estão registrados como decisão única.

### AUD-DOC-005 — Sem documentação jurídica estruturada

Links de termos e privacidade são `#`; cadastro histórico aponta para rotas inexistentes.

## Recomendação

Substituir o README na Fase B2 e criar documentação operacional incremental vinculada às fases de refatoração. Conteúdo jurídico deverá ser estruturado como minuta e marcado para revisão profissional.

## Próxima fase sequencial

FASE A15/A16 — Fluxos críticos e código legado.
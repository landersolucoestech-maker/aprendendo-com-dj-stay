# FASE A7/A8 — Storage, upload, mídia, integrações e contratos

Status: concluída.

## Storage atual

Supabase `dev` e produção possuem zero buckets. O código referencia buckets existentes apenas no projeto legado.

Buckets legados descritos por migrations:

- `avatars` — público;
- `lesson-samples` — público;
- `lesson-projects` — público.

## Achados de storage

### AUD-STORAGE-001 — Materiais protegidos modelados como públicos

Samples e projetos de aula recebem leitura pública por policy e bucket público. Isso ignora compra, matrícula, prazo, revogação e ownership.

### AUD-STORAGE-002 — Qualquer autenticado pode gerenciar materiais

Migrations permitem INSERT/UPDATE/DELETE para `authenticated` sem validar papel administrativo, aula, propriedade ou finalidade.

### AUD-STORAGE-003 — Uso depreciado de `auth.role()`

Policies legadas usam `auth.role() = 'authenticated'`, padrão depreciado e insuficiente para autorização.

### AUD-STORAGE-004 — Avatar persiste URL pública

O fluxo cria caminho pelo usuário, usa bucket público e salva `avatar_url`. Não existe entidade de asset, confirmação transacional ou limpeza confiável de versões anteriores.

### AUD-STORAGE-005 — Validação de upload insuficiente

A validação de avatar depende de `file.type.startsWith('image/')` e tamanho no cliente. Não há validação server-side, inspeção de conteúdo, extensão permitida, metadados, quarentena ou auditoria.

### AUD-STORAGE-006 — Downloads fabricados

Para `lesson-samples` e `lesson-projects`, o código ignora o objeto armazenado e gera texto no navegador, entregando-o como `.zip` ou `.als`. O sucesso exibido não corresponde ao download do arquivo real.

### AUD-STORAGE-007 — Referência permanente inadequada

O modelo legado persiste paths soltos e URLs públicas. Não existe `asset_id`, estado de processamento, versionamento, checksum, finalidade, proprietário, tamanho, MIME canônico ou lifecycle.

### AUD-STORAGE-008 — Mídia externa sem hardening

O player aceita URL arbitrária ou YouTube e a injeta em iframe. Não há allowlist de hostname/provider, normalização robusta, `sandbox`, `referrerPolicy`, CSP dedicada ou renovação de URL.

## Integrações

| Integração | Estado |
| --- | --- |
| Supabase Data API | hardcoded para legado |
| Supabase Auth | código órfão/parcial |
| Supabase Storage | legado e inseguro |
| e-mail | simulado |
| contato | simulado |
| pagamento | ausente |
| Pix | ausente |
| webhook | ausente |
| analytics | dados fictícios |
| vídeo | iframe sem validação |

## Contratos

### AUD-CONTRACT-001 — Tipos gerados desatualizados

Os tipos versionados descrevem outro ambiente. Os tipos reais de `dev` e produção estão vazios.

### AUD-CONTRACT-002 — Tipos manuais conflitantes

Há múltiplas representações para aulas e módulos, com transformação silenciosa de dados ausentes em defaults.

### AUD-CONTRACT-003 — Ausência de schemas Zod de domínio

Zod está instalado, mas não há schemas comprovados para cursos, assets, pagamentos, matrículas, formulários ou integrações.

### AUD-CONTRACT-004 — Erros mascarados

Valores ausentes são convertidos em `Sem título`, `Descrição não disponível`, `15:30`, array vazio ou estado falso, impedindo distinguir dado válido de contrato quebrado.

## Referência oficial

A documentação atual do Supabase define RLS como mecanismo de controle de acesso e oferece URLs assinadas temporárias para buckets privados. A arquitetura futura deverá persistir referência interna do asset, não URL assinada.

## Próxima fase sequencial

FASE A9 — Pagamentos, pedidos e afiliados.
# FASE A2 — Documentação, configuração e arquitetura

Status: concluída com evidências remotas e limitações ambientais registradas.

## Visão arquitetural encontrada

A aplicação é um SPA React 18 + Vite 5 + React Router 6 + React Query 5, acoplado diretamente ao Supabase pelo navegador. Não existe backend de domínio, camada de serviços, adaptadores de pagamento, Edge Functions, API própria, fila, worker ou workflow de processamento assíncrono.

Fluxo predominante:

```text
Página/componente React
→ hook React Query
→ cliente Supabase hardcoded
→ tabela/storage legado
```

## Achados

### AUD-ARCH-001 — Ausência de separação de domínio

- Severidade: alta.
- Evidência: páginas e hooks consultam tabelas diretamente; regras de progresso, acesso e arquivos estão distribuídas no frontend.
- Impacto: autorização visual, regras duplicadas, contratos inconsistentes e impossibilidade de validar operações sensíveis no servidor.

### AUD-ARCH-002 — Fontes de verdade concorrentes

- Severidade: crítica.
- Código e tipos apontam para o projeto legado `uonsgcndzzuclcixoaei`.
- Supabase `dev` e produção atuais não possuem tabelas `public` da aplicação.
- O frontend mantém dados demonstrativos, conteúdo comercial hardcoded e tipos gerados de outro ambiente.

### AUD-ARCH-003 — Escopo canônico ausente

Não existem implementações operacionais para:

- CMS administrativo;
- cursos múltiplos;
- matrículas por curso;
- avaliações;
- certificados persistidos;
- marketplace;
- pedidos;
- pagamentos reais;
- Pix;
- webhooks;
- afiliados;
- comissões;
- auditoria;
- notificações;
- relatórios financeiros.

### AUD-ARCH-004 — Estrutura de template preservada como produto

- README ainda é o padrão Lovable.
- `index.html` mantém metadados e script externo do GPT Engineer/Lovable.
- Nome do pacote: `vite_react_shadcn_ts`.
- Versão: `0.0.0`.
- Marca e domínio não estão centralizados.

### AUD-ARCH-005 — Contratos duplicados

Interfaces `Lesson` e `Module` aparecem em múltiplos componentes e hooks com nomes de propriedades divergentes, incluindo:

- `title` e `titulo`;
- `description` e `descricao`;
- `video`, `video_url` e `videoUrl`;
- `duration` e `duracao`;
- `order_num` e `ordem`.

### AUD-ARCH-006 — Dependência de estado de interface para regras canônicas

- Conclusão de aula pode ser apenas estado local.
- Certificado é representado por toast.
- Sucesso de pagamento é uma página estática.
- Reenvio de e-mail e contato são simulados.

## Documentação inexistente

Não foram encontrados documentos válidos para:

- arquitetura;
- banco;
- APIs;
- ADRs;
- runbooks;
- backup/restore;
- RPO/RTO;
- rollback;
- configuração de ambientes;
- deploy controlado;
- domínio funcional;
- threat model.

## Avaliação

A estrutura atual representa um protótipo visual com integração Supabase legada e não uma arquitetura operacional compatível com o escopo canônico.

## Próxima fase sequencial

FASE A3 — Frontend.
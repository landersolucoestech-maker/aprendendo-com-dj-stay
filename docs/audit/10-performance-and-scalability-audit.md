# FASE A13 — Desempenho, escalabilidade e resiliência

Status: concluída por análise estática; medições de bundle e runtime bloqueadas sem checkout.

## Achados confirmados

### AUD-PERF-001 — Bundle monolítico

Todas as páginas são importadas estaticamente em `App.tsx`. Não existe lazy loading por rota ou separação entre público, aluno, admin, afiliado, checkout e analytics.

### AUD-PERF-002 — Queries duplicadas

`Dashboard`, `UserProfile`, `VideoPlayer`, `RecentActivities` e hooks de cálculo podem buscar repetidamente aulas, progresso e perfil. Não existe camada de selectors/normalização compartilhada.

### AUD-PERF-003 — Polling desnecessário

`ConnectionStatus` consulta `modulos` a cada 30 segundos para inferir conectividade. Além de consultar tabela inexistente, confunde erro de autorização/schema com indisponibilidade de rede.

### AUD-PERF-004 — Logs em render e operações frequentes

Há `console.log` em renderizações, queries, mudanças de formulário e ações de modal. Isso gera ruído, pode expor dados e degrada observabilidade.

### AUD-PERF-005 — Progresso calculado por buscas repetidas

Para cada módulo/aula, `useProgressCalculation` executa `find` sobre a lista de progresso. O custo cresce de forma multiplicativa e os contratos são duplicados.

### AUD-PERF-006 — Ausência de índices canônicos

O schema canônico ainda não existe. As migrations legadas não definem índices explícitos para ordenação, consultas temporais, status, ownership ou relatórios além de constraints únicas básicas.

### AUD-PERF-007 — Ausência de concorrência e idempotência

Não há proteção contra:

- múltiplas abas;
- múltiplos dispositivos;
- progresso fora de ordem;
- eventos duplicados;
- duplo checkout;
- webhook repetido;
- reprocessamento;
- substituição concorrente de arquivos.

### AUD-PERF-008 — Sem estratégia para arquivos grandes

Não existem uploads resumíveis, multipart, processamento assíncrono, fila, backpressure, checksum ou limpeza de uploads incompletos.

### AUD-PERF-009 — Ausência de Error Boundaries

Falhas de renderização ou lazy loading futuro podem remover toda a interface. React recomenda Error Boundaries para fallback de erros e `lazy` + `Suspense` para divisão de código.

## Hipóteses a validar após checkout

- tamanho do bundle;
- chunks duplicados;
- dependências não utilizadas;
- tempo de carregamento;
- Core Web Vitals;
- re-renderizações;
- acessibilidade de desempenho;
- cache HTTP/CDN.

## Requisitos de resiliência

- idempotency keys;
- transações de domínio;
- retries limitados e classificados;
- timeout explícito;
- fila para webhooks/processamentos;
- deduplicação;
- versionamento otimista;
- estado canônico no banco;
- degradação segura;
- observabilidade por correlação.

## Próxima fase sequencial

FASE A14 — Observabilidade, operação, CI/CD e deploy.
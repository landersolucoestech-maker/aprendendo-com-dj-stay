# FASE A6 — Autenticação e autorização

Status: concluída.

## Estado atual

A autenticação foi removida das rotas ativas no commit `23a1a2e7f2833e6c55b978be458192f716c7918f`.

Arquivos de login, cadastro e recuperação ainda existem, mas não são alcançáveis pelo roteador atual.

## Fluxos

| Fluxo | Estado |
| --- | --- |
| cadastro | código órfão; sem rota ativa |
| login | código órfão; sem rota ativa |
| logout | botão disponível no Dashboard público |
| recuperação | simulação local; sem chamada Auth |
| redefinição | ausente |
| confirmação | páginas estáticas e reenvio simulado |
| renovação de sessão | não centralizada |
| expiração | não tratada globalmente |
| limpeza de cache | ausente |
| roles | ausentes nos ambientes atuais |
| guards | ausentes |
| RLS operacional | inexistente nos ambientes atuais |

## Achados

### AUD-AUTH-001 — Bypass estrutural de autenticação

A raiz e as páginas de conteúdo são públicas. Não existe guard de sessão ou matrícula.

### AUD-AUTH-002 — Código de Auth órfão e contraditório

- `Navigation` observa sessão e aponta para rotas removidas.
- `DashboardHeader` permite logout mesmo com usuário demonstrativo.
- hooks de perfil/progresso exigem usuário, mas as páginas não exigem sessão.
- componentes podem entrar em erro permanente em vez de redirecionar.

### AUD-AUTH-003 — Cadastro registra dados sensíveis em console

`Register.tsx` registra alterações de campos e o objeto completo do formulário durante validação. Isso pode incluir senha e confirmação de senha no console do navegador.

### AUD-AUTH-004 — Redirect de cadastro genérico

O cadastro histórico usa `window.location.origin + '/'`, sem rota explícita de callback, validação de ambiente ou tratamento seguro de retorno.

### AUD-AUTH-005 — Autorização por assinatura insuficiente no histórico

A implementação removida de `AccessControl` considerava apenas uma linha `user_subscriptions` com status/expiração. Não havia vínculo por curso, pedido confirmado, produto, matrícula, revogação, chargeback ou origem da concessão.

### AUD-AUTH-006 — Modelo de papéis canônico ausente

Não existem autorizações separadas para:

- aluno;
- afiliado;
- administrador proprietário.

### AUD-AUTH-007 — Sessão e cache

Listeners de Auth são distribuídos em componentes/hooks. O logout não limpa React Query, permitindo retenção de dados em memória entre sessões.

### AUD-AUTH-008 — Testes negativos ausentes

Não existem testes para:

- acesso cruzado entre alunos;
- afiliado acessando outro afiliado;
- aluno acessando admin;
- usuário sem matrícula;
- alteração de IDs;
- sessão antiga após mudança de papel;
- RPC privilegiada.

## Requisito de correção

Autenticação deverá ser centralizada. Autorização deverá ser aplicada no banco/RPC/Edge Function, com RLS por ownership e papel, sem depender de `user_metadata` ou de controles visuais.

## Próxima fase sequencial

FASE A7 — Storage, upload e proteção de mídia.
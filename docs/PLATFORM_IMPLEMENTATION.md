# Plataforma Aprendendo com DJ Stay

## Escopo

A aplicação possui três áreas:

- pública: site, autenticação, cadastro, contato e verificação de certificado;
- aluno: dashboard, cursos, aulas, progresso, materiais, catálogo, carrinho, pedidos e suporte;
- gestão: indicadores, CMS, alunos, vendas, reembolsos e atendimento.

Não existe aula ao vivo. Os formatos suportados são vídeo gravado, áudio e conteúdo textual.

## Projeto Supabase

O projeto esperado pelo repositório é `uonsgcndzzuclcixoaei`. Não aplique as migrations em outro projeto.

## Frontend

Crie um arquivo local baseado em `.env.example` e configure:

- URL do projeto Supabase;
- chave publicável do projeto;
- e-mail público de suporte, quando aplicável.

Credenciais administrativas e credenciais de pagamento nunca podem usar o prefixo `VITE_` nem ser incluídas no frontend.

## Banco de dados

Vincule a Supabase CLI ao projeto correto, revise as migrations pendentes e aplique primeiro em homologação.

As migrations criam:

- perfis, papéis e autorização;
- cursos, módulos, aulas e materiais;
- matrículas, progresso e certificados;
- produtos, ofertas, cupons, carrinhos e pedidos;
- pagamentos, reembolsos e eventos de webhook;
- atendimento, notificações e auditoria;
- buckets privados e políticas RLS.

O conteúdo legado é migrado das tabelas antigas para um curso inicial.

## Proprietário inicial

Quando já existe usuário no momento da migration, o usuário mais antigo recebe o papel `owner` se não houver proprietário.

Quando o banco estiver vazio, crie a primeira conta e atribua o papel `owner` uma única vez pelo ambiente administrativo do banco. Depois disso, a gestão de papéis deve usar as RPCs administrativas existentes.

## Edge Functions

Configure no ambiente seguro das Edge Functions:

- credencial privada do Mercado Pago;
- segredo de assinatura do webhook;
- URL pública do site;
- origem autorizada do site.

Implante:

- `create-checkout`;
- `mercado-pago-webhook`, sem validação JWT porque usa assinatura própria;
- `refund-payment`.

A URL de webhook segue o padrão:

```text
https://uonsgcndzzuclcixoaei.supabase.co/functions/v1/mercado-pago-webhook
```

## Fluxo financeiro

```text
Oferta → Carrinho → Pedido → Checkout Mercado Pago
→ Webhook assinado → Consulta do pagamento na API
→ Pagamento persistido → Matrícula liberada
```

Controles implementados:

- valores em centavos de real;
- snapshots imutáveis;
- idempotência;
- deduplicação de eventos;
- validação HMAC;
- conferência de valor e moeda;
- proteção contra rebaixamento de estado;
- revogação após reembolso integral;
- credenciais privadas fora do navegador.

## Papéis

- `student`: aluno;
- `instructor`: administra os próprios cursos;
- `support`: atende solicitações;
- `admin`: administração operacional;
- `owner`: controle total.

As permissões são aplicadas por RLS. Guards do React são uma camada adicional, não substituem o banco.

## Buckets

- `course-images`: capas públicas;
- `course-videos`: vídeo e áudio privados;
- `course-assets`: materiais privados;
- `support-attachments`: anexos privados.

Arquivos de curso devem iniciar pelo UUID do curso. Anexos de suporte devem iniciar pelo UUID do ticket.

## Validação

Execute:

```bash
npm ci
npm run check
```

A CI executa ESLint, TypeScript e build de produção.

## Homologação obrigatória

1. Criar usuários para todos os papéis.
2. Validar acessos permitidos e negados.
3. Criar e publicar curso completo.
4. Testar upload e download privado.
5. Comprar em sandbox.
6. Confirmar que retorno do navegador não libera acesso sem webhook.
7. Confirmar matrícula após webhook aprovado.
8. Testar progresso e conclusão.
9. Verificar certificado público.
10. Reembolsar e confirmar revogação.
11. Testar atendimento e nota interna.
12. Revisar auditoria e webhooks falhos.

## Pendência externa

O código está versionado. As migrations e Edge Functions somente entram em funcionamento após implantação no projeto Supabase `uonsgcndzzuclcixoaei`. A conexão disponível durante esta implementação não continha esse projeto, portanto nenhuma alteração foi aplicada a bancos diferentes.

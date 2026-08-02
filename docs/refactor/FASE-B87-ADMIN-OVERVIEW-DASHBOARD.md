# Fase B87 — dashboard administrativo do proprietário

## Objetivo

Criar a visão inicial real do módulo administrativo para o único instrutor/proprietário da plataforma.

Antes desta fase:

- o papel `administrador_proprietario` era direcionado diretamente para `/admin/cursos`;
- a navegação administrativa não possuía uma visão geral;
- não existia uma superfície que consolidasse financeiro, alunos, catálogo e filas operacionais;
- qualquer leitura gerencial dependia de abrir módulos isolados.

## Implementação

A rota protegida `/admin` passou a renderizar `AdminDashboard` dentro do mesmo `AdminRoute` utilizado pelas demais áreas administrativas.

O dashboard compõe seis read models reais já existentes:

- pedidos e pagamentos;
- alunos, matrículas e certificados;
- cursos;
- produtos digitais;
- suporte;
- contatos.

Os indicadores são calculados pela função pura `buildAdminOverview`, coberta por testes unitários. A interface não consulta tabelas sem contrato, não cria estados financeiros e não altera qualquer domínio.

## Indicadores apresentados

### Financeiro

- quantidade total de pedidos;
- pedidos pendentes;
- pedidos pagos;
- valor confirmado;
- valor reembolsado;
- chargeback perdido.

O valor confirmado é exibido como dado operacional do read model. Ele não é rotulado como receita líquida, lucro, caixa disponível ou conciliação contábil.

### Acadêmico

- alunos retornados pelo read model administrativo;
- matrículas totais, ativas e suspensas;
- certificados válidos;
- conclusão média das matrículas retornadas.

### Catálogo

- cursos totais, publicados, em rascunho e arquivados;
- produtos digitais totais, publicados, em rascunho e arquivados.

### Operação

- tickets aguardando suporte;
- tickets aguardando aluno;
- tickets urgentes;
- contatos novos, em andamento e resolvidos;
- fila operacional composta por pagamentos pendentes, tickets aguardando suporte e novos contatos.

## Navegação e autorização

- `RoleLandingRedirect` direciona o proprietário para `/admin`;
- “Visão geral” é o primeiro item da navegação administrativa;
- o item raiz usa correspondência exata para não permanecer ativo nas subrotas;
- todas as áreas permanecem sob `RequireAuth` e `RequireRole` para `administrador_proprietario`.

## Contratos

- `scripts/check-admin-dashboard.mjs` bloqueia a remoção dos seis read models, da rota protegida, do destino do proprietário e dos indicadores centrais;
- o contrato B45 foi ampliado para incluir `/admin`;
- `src/lib/admin-overview.test.ts` cobre operação vazia e agregação de estados persistidos;
- `check:admin-dashboard` participa do `typecheck` bloqueante.

## Escopo excluído

- nenhuma migration foi criada ou alterada;
- nenhuma RPC, tabela, policy ou Edge Function foi criada ou alterada;
- nenhuma escrita foi executada no Supabase remoto;
- nenhuma credencial ou configuração de provider foi alterada;
- não foram adicionadas estimativas, projeções ou dados de exemplo;
- produção e a branch `main` permaneceram sem alterações.

A fase foi executada exclusivamente na branch `dev`.

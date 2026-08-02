# Fase B83 — navegação principal do Portal do Aluno

## Objetivo

Garantir que todas as áreas principais já implementadas para o aluno possam ser alcançadas pelo menu compartilhado do portal.

A auditoria identificou duas rotas funcionais que não estavam expostas na navegação:

- `/aluno/certificados` — **Certificados**;
- `/aluno/produtos` — **Meus produtos**.

## Implementação

As duas entradas foram adicionadas ao array `studentNavigation` de `StudentPortalShell.tsx`.

Como desktop e mobile renderizam o mesmo componente `StudentNavigation`, não existem listas paralelas que possam divergir. A navegação mantém:

- início do portal com correspondência exata (`end: true`);
- rotas principais com correspondência por prefixo (`end: false`);
- ícones semânticos para certificados e produtos;
- caminhos únicos;
- exclusão de rotas de detalhe, como curso individual e edição de perfil.

## Paridade de rotas

O contrato B83 compara o menu com as rotas principais registradas em `App.tsx`:

- Início;
- Meus cursos;
- Certificados;
- Biblioteca;
- Meus produtos;
- Favoritos;
- Pedidos;
- Pagamentos;
- Notificações;
- Suporte;
- Histórico;
- Perfil;
- Preferências;
- Privacidade.

A página de certificados continua consultando `useMyCertificates`, e a página de produtos continua consultando `useMyDigitalProducts`. A fase altera somente a descoberta e navegação dessas superfícies.

## Contratos

- `scripts/check-student-navigation.mjs` verifica rotas, rótulos, ícones, ordem, ausência de duplicatas e reutilização desktop/mobile.
- O contrato acadêmico B21 passou a exigir que a rota de certificados esteja presente no shell navegável.
- O novo checker é executado pelo `typecheck` após o contrato do Portal do Aluno e antes do player.

## Escopo excluído

- Nenhuma migration foi criada ou alterada.
- Nenhuma RPC, policy, tabela ou dado foi alterado.
- Nenhuma Edge Function foi alterada.
- Nenhuma operação foi executada no Supabase remoto.
- Nenhuma alteração foi feita na branch `main`.

# Fase B84 — frame persistente para páginas do aluno

## Objetivo

Garantir que as áreas principais acessadas pelo menu do Portal do Aluno mantenham a navegação desktop e mobile durante toda a jornada.

A auditoria posterior à B83 identificou duas exceções:

- **Certificados** abria em um `AppPageShell` isolado;
- **Meus produtos** reutilizava exclusivamente o layout genérico do marketplace.

Ao abrir essas rotas, o aluno perdia o `StudentPortalShell`, embora Favoritos, Pedidos, Pagamentos, Notificações e Suporte já preservassem o shell compartilhado.

## Frame autenticado

Foi criado `StudentPortalPageFrame.tsx`, responsável por:

- ler a conta autenticada;
- resolver o nome por `getUserMetadataProfile`;
- preservar nome e e-mail no shell;
- controlar o estado de logout;
- executar `signOut`;
- redirecionar para `/login` após sair;
- exibir estado de validação enquanto a sessão não está disponível;
- renderizar o conteúdo dentro de `StudentPortalShell`.

O frame não acessa Supabase diretamente e não depende de React Query.

## Certificados

`/aluno/certificados` continua protegido por `StudentRoute`, mas a página `Certificates.tsx` agora usa `StudentPortalPageFrame`.

Foram preservados:

- `useMyCertificates`;
- estados de carregamento, erro e vazio;
- histórico de certificados emitidos e revogados;
- código e percentual de conclusão;
- validação pública;
- impressão.

## Meus produtos

`MyDigitalProducts.tsx` passou a possuir modo dual:

- `/aluno/produtos` renderiza `<MyDigitalProducts studentPortal />` dentro do frame do aluno;
- `/meus-produtos` continua renderizando `<MyDigitalProducts />` no `AppPageShell` genérico para aluno, afiliado ou administrador autorizado.

O conteúdo real foi centralizado em `DigitalProductsContent`, evitando duas implementações de consulta e apresentação.

Foram preservados:

- `useMyDigitalProducts`;
- `useDigitalProductDeliverables`;
- acessos e licenças;
- entregáveis privados;
- downloads por `downloadPrivateAsset`;
- estados de carregamento, erro e vazio.

## Contratos

- B16 protege o modo dual e a rota multi-papel.
- B21 exige certificados no shell persistente.
- B83 exige que as entradas navegáveis mantenham o frame.
- B38 permanece como referência de página independente já integrada ao shell.
- `scripts/check-student-page-frame.mjs` valida frame, rotas, páginas, conteúdo compartilhado e integração dos contratos.

## Escopo excluído

- Nenhuma migration foi criada ou alterada.
- Nenhuma RPC, tabela, policy ou dado foi alterado.
- Nenhum fluxo de Auth foi alterado; apenas o consumo da sessão existente foi centralizado no frame.
- Nenhuma regra ou objeto de Storage foi alterado.
- Nenhuma Edge Function foi alterada.
- Nenhuma operação foi executada no Supabase remoto.
- Nenhuma alteração foi feita na branch `main`.

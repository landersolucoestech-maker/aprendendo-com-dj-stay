# Fase B85 — edição de perfil no shell do aluno

## Objetivo

Manter a jornada de edição de perfil do aluno dentro do `StudentPortalShell`, sem retirar a rota genérica usada por afiliado e administrador.

Antes desta fase, a rota específica `/aluno/perfil/editar` existia, mas renderizava o mesmo layout isolado de `/editar-perfil`. Além disso, o botão da seção Perfil apontava diretamente para a rota genérica.

## Modo dual

`EditProfile.tsx` passou a aceitar a propriedade opcional `studentPortal`:

- `/aluno/perfil/editar` renderiza `<EditProfile studentPortal />`;
- `/editar-perfil` continua renderizando `<EditProfile />` para os papéis já autorizados.

O editor mantém um único estado de formulário e uma única implementação de gravação. Não existem duas versões da validação, do upload ou da atualização do usuário.

## Fluxo do aluno

No modo aluno:

- carregamento, erro e formulário são renderizados em `StudentPortalPageFrame`;
- o cabeçalho usa `StudentSectionHeader`;
- cards e ação principal utilizam o contexto visual do curso;
- voltar e cancelar retornam para `/aluno/perfil`;
- a seção Perfil aponta para `/aluno/perfil/editar`;
- a rota de edição permanece fora do menu principal por ser uma rota de detalhe.

## Compatibilidade multi-papel

A rota `/editar-perfil` foi preservada sem a propriedade `studentPortal`.

O Portal do Afiliado continua utilizando essa rota genérica. A autorização existente para aluno, afiliado e administrador proprietário não foi alterada.

## Comportamento preservado

- leitura por `getUserMetadataProfile`;
- validação por `profileMetadataInputSchema` e `parseDataContract`;
- atualização por `supabase.auth.updateUser`;
- atualização de `full_name`, telefone, biografia, Instagram, YouTube e website;
- `refreshSession` após gravação;
- mensagens de sucesso e erro;
- upload de avatar por `useAvatarUpload`;
- formatos JPEG, PNG e WebP;
- limites de nome, telefone, biografia e URLs;
- exigência de URLs HTTPS pelo contrato canônico B79.

## Contratos

- B79 protege a validação e a gravação canônica no modo dual.
- B23 protege o contexto visual delegado pelo frame.
- B83 protege a rota específica e mantém a rota de detalhe fora do menu.
- B84 protege a reutilização de `StudentPortalPageFrame`.
- `scripts/check-student-profile-editor.mjs` cruza rotas, links, formulário, upload, contratos e integração no `typecheck`.

## Escopo excluído

- Nenhuma migration foi criada ou alterada.
- Nenhuma RPC, tabela, policy ou dado foi alterado.
- Nenhuma regra de Auth foi alterada; o editor continua consumindo `updateUser` e `refreshSession` existentes.
- Nenhuma regra ou objeto de Storage foi alterado.
- Nenhuma Edge Function foi alterada.
- Nenhuma operação foi executada no Supabase remoto.
- Nenhuma alteração foi feita na branch `main`.

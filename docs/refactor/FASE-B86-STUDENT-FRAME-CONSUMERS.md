# Fase B86 — consumidores centralizados do frame do aluno

## Objetivo

Eliminar seis implementações repetidas de sessão, identidade, logout e `StudentPortalShell` nas páginas independentes do Portal do Aluno.

Antes desta fase, cada página repetia:

- `useAuth`;
- leitura de `getUserMetadataProfile`;
- `useMemo` para o nome exibido;
- estado `isSigningOut`;
- função `handleSignOut`;
- redirecionamento para `/login`;
- propriedades completas do `StudentPortalShell`.

Essa responsabilidade já havia sido centralizada em `StudentPortalPageFrame` na B84.

## Seis páginas migradas

- `StudentFavorites.tsx`;
- `StudentNotifications.tsx`;
- `StudentSupport.tsx`;
- `StudentFinancialPortal.tsx`;
- `StudentCommunicationPreferences.tsx`;
- `StudentPrivacyRights.tsx`.

Cada página agora importa e utiliza exatamente um `StudentPortalPageFrame`. A identidade, o e-mail, o estado de logout e o redirecionamento ficam exclusivamente no frame compartilhado.

## Comportamento preservado

### B38 — financeiro

Foram preservados histórico de pedidos e pagamentos, resumo financeiro, tentativas de cobrança, situação de acesso, moeda e estados dos pedidos.

### B39 — suporte

Foram preservados criação de tickets, respostas, chaves de idempotência, prioridades, categorias, histórico e toasts.

### B40 — notificações

Foram preservadas listagem, contagem não lida, marcação individual, marcação em massa e caminhos de ação.

### B41 — favoritos

Foram preservados listagem, remoção pelo `FavoriteToggleButton`, links de ação e acesso ao marketplace.

### B42 — preferências

Foram preservados estados dos switches, consentimento versionado, comunicações transacionais, marketing e analytics opcionais.

### B44 — privacidade

Foram preservadas criação, cancelamento e listagem das solicitações, tipos de direito, histórico de eventos e análise administrativa.

## Contratos

- `scripts/check-student-frame-consumers.mjs` verifica as seis páginas e bloqueia o retorno dos wrappers locais.
- O gate cruza as garantias de negócio dos contratos B38, B39, B40, B41, B42 e B44.
- O contrato B84 foi alinhado para exigir o frame no portal financeiro.
- O novo checker é executado após B85 e antes do player.

## Escopo excluído

- Nenhuma migration foi criada ou alterada.
- Nenhuma RPC, tabela, policy ou dado foi alterado.
- Nenhum hook, formulário ou mutação de domínio foi substituído.
- Nenhuma regra de Auth foi alterada; apenas o consumo do wrapper existente foi centralizado.
- Nenhuma regra ou objeto de Storage foi alterado.
- Nenhuma Edge Function foi alterada.
- Nenhuma operação foi executada no Supabase remoto.
- Nenhuma alteração foi feita na branch `main`.

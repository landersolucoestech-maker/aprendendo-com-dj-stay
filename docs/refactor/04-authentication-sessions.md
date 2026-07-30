# FASE B5 — Autenticação, sessões e rotas protegidas

Status: implementação gravada; validação automática obrigatória.

## Implementação

- `AuthProvider` único para sessão, usuário e erro de inicialização;
- listener `onAuthStateChange` centralizado;
- QueryClient único e cache limpo ao trocar usuário ou encerrar sessão;
- Supabase Auth configurado com PKCE, persistência e renovação automática;
- login, cadastro, confirmação, reenvio, recuperação e redefinição reais;
- callbacks validados e redirecionamento interno protegido contra open redirect;
- Dashboard, aulas e edição de perfil protegidos por `RequireAuth`;
- páginas de login, cadastro e recuperação protegidas por `PublicOnlyRoute`;
- landing page restaurada em `/`;
- perfil do usuário derivado da sessão real, sem usuário demonstrativo;
- atualização de perfil persistida em `user_metadata`;
- contrato estático `check:auth` integrado ao typecheck.

## Limites

- nenhuma tabela, policy, bucket ou migration foi criada nesta fase;
- autorização por matrícula e pagamento pertence às fases de domínio e pagamento;
- produção permanece somente leitura;
- a fase só pode ser encerrada após `npm ci`, lint, TypeScript estrito e build aprovados no GitHub Actions.

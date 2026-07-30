# FASE CONCLUÍDA: B4 — Configuração de GitHub, Supabase e ambientes

Escopo:
- Remover configuração Supabase hardcoded, centralizar contrato público e vincular cada ambiente ao project ref correto.

Estado anterior:
- URL, chave publicável e project ref legados hardcoded.
- Cliente Supabase responsável pela própria configuração.
- `supabase/config.toml` apontando para o projeto legado.
- Ausência de validação de ambiente, URL, chave e combinação branch/projeto.

Itens analisados ou modificados:
- Cliente Supabase.
- Tipos de variáveis Vite.
- Configuração pública.
- Vínculo do Supabase CLI.
- Manifesto e gates de ambiente.
- Documentação operacional.

Achados ou correções:
- Criada origem única e tipada em `src/config/public-config.ts`.
- Mapeamento `development → jmtyurketfclaneqxohu` e `production → tduvfrxagujryfnqpdmc` aplicado.
- Cliente Supabase deixou de conter URL, chave ou project ref.
- URL validada como origem HTTPS sem path, query, hash, porta ou credenciais.
- Project ref extraído do hostname e comparado com o ambiente declarado.
- `VITE_APP_ENV` comparado com `MODE`, `DEV` e `PROD` do Vite.
- Chaves `sb_secret_*`, JWT `service_role`, JWT `anon` de outro projeto e formatos desconhecidos são rejeitados.
- Chaves publishable modernas e JWT `anon` compatível são aceitos sem registro do valor.
- `supabase/config.toml` vinculado exclusivamente ao Supabase `dev`.
- Gate estático impede referência legada em runtime, `.env` versionado e hardcode no cliente.

Arquivos:
- Criados: `src/config/public-config.ts`, `src/vite-env.d.ts`, `scripts/check-environment-contract.mjs`, `docs/refactor/03-environments.md`.
- Atualizados: `src/integrations/supabase/client.ts`, `supabase/config.toml`, `package.json`, `docs/environment.md`.
- Removido: marcador temporário da fase.

Banco e migrations:
- Nenhuma migration, seed ou alteração de schema.
- Nenhuma alteração em Auth, Storage, policies, functions, secrets ou registros.
- Produção permaneceu somente leitura.

Comandos executados:
- `npm install --package-lock-only --ignore-scripts`.
- `npm ci`.
- `npm run lint`.
- `npm run check:environment`.
- `npm run typecheck`.
- `npm run build`.

Resultados e códigos de saída:
- Sincronização do lockfile: código 0.
- Instalação limpa: código 0.
- Lint: código 0.
- Contrato de ambiente: código 0.
- Typecheck estrito: código 0.
- Build: código 0.
- Gate final: código 0.

Testes:
- Validação estática do contrato integrada ao typecheck.
- Testes unitários de combinações de ambiente permanecem pendentes para a fase de testes automatizados.

Evidências:
- Commit: `0efb81d1f47750430fe10e2d12965403050f3ca4`.
- Tree SHA: `1e5b83b327dc61958ffa86cfc33c59b0aca98249`.
- Workflow run: `30517699542`.
- Issue técnica: `#13 — Gate técnico — 0efb81d1f477`.

Bloqueios:
- Variáveis reais da plataforma de hospedagem ainda não foram configuradas porque não existe deploy controlado nesta fase.
- Projeto Supabase legado continua inacessível para reconciliação, mas não é mais aceito em runtime.

Pendências:
- Centralizar autenticação e sessão.
- Configurar variáveis de hospedagem somente na fase de deploy controlado.

Próxima fase sequencial:
- FASE B5 — Autenticação e sessões.

# Configuração de ambientes

## Princípios

- o frontend recebe somente configuração pública;
- segredos permanecem exclusivamente em backend, Edge Functions ou secret manager;
- não existe fallback silencioso entre ambientes;
- o projeto Supabase legado é proibido como runtime;
- arquivos `.env` são locais e não são versionados;
- o ambiente é declarado explicitamente por `VITE_APP_ENV`;
- todo build de entrega deve possuir uma revisão imutável.

## Mapeamento obrigatório

| GitHub | `VITE_APP_ENV` | Supabase | Project ref |
| --- | --- | --- | --- |
| `dev` | `development` | branch de desenvolvimento | `jmtyurketfclaneqxohu` |
| `main` | `production` | produção | `tduvfrxagujryfnqpdmc` |

Produção permanece somente leitura durante a auditoria e a refatoração.

## Variáveis públicas do frontend

O `.env` local de desenvolvimento deverá definir:

```text
VITE_APP_ENV=development
VITE_SUPABASE_URL=https://jmtyurketfclaneqxohu.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<chave publishable ativa do projeto dev>
```

A hospedagem de produção deverá fornecer exclusivamente:

```text
VITE_APP_ENV=production
VITE_SUPABASE_URL=https://tduvfrxagujryfnqpdmc.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<chave publishable ativa de produção>
```

Nenhum valor de chave ativa pode ser copiado para o repositório, documentação, issue ou log.

## Smoke de runtime no CI

O workflow técnico da branch `dev` produz um artefato de qualidade não implantável para executar o JavaScript compilado no Chrome headless. Esse estágio não recebe uma chave ativa do Supabase.

A configuração sintética exige simultaneamente:

```text
VITE_APP_ENV=development
VITE_CI_RUNTIME_SMOKE=true
VITE_SUPABASE_URL=https://jmtyurketfclaneqxohu.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_ci_runtime_smoke_only_not_for_deployment
```

O valor sintético não é uma credencial, não autentica no Supabase e existe somente para permitir que a inicialização do cliente atravesse o bootstrap durante o smoke público. A aplicação o aceita apenas em build Vite `development`, com a flag exatamente igual a `true`.

A flag é proibida em produção, em hospedagem, em builds de entrega e em desenvolvimento local normal. Qualquer build implantável continua exigindo uma chave publishable ativa fornecida pelo ambiente.

## Proveniência de release

A revisão do build é resolvida nesta ordem:

1. `VITE_APP_RELEASE`, quando o operador fornece um identificador imutável explícito;
2. `GITHUB_SHA`, disponibilizado automaticamente no GitHub Actions;
3. `git rev-parse HEAD`, para builds locais executados dentro do repositório.

`VITE_APP_RELEASE` é opcional e não contém segredo. Quando utilizada, deve identificar uma revisão ou release imutável; não use valores genéricos como `latest`, `production` ou `development`.

O build gera `dist/release.json` e injeta a mesma revisão no runtime. Um build de entrega sem revisão resolvida é bloqueado.

## Validações executadas pela aplicação

A criação do cliente Supabase falha explicitamente quando houver:

- variável ausente;
- `VITE_APP_ENV` fora do enum permitido;
- modo Vite incompatível com o ambiente declarado;
- URL inválida ou sem HTTPS;
- URL com path, query, hash, credencial ou porta;
- hostname fora de `<project-ref>.supabase.co`;
- project ref incompatível com o ambiente;
- chave `sb_secret_*`;
- JWT público com role diferente de `anon`;
- JWT `anon` emitido para outro project ref;
- chave em formato desconhecido;
- flag de smoke com valor diferente de `true`;
- token sintético sem a flag de smoke;
- flag de smoke combinada com uma chave normal;
- token sintético fora de `development`.

Chaves modernas `sb_publishable_*` são aceitas sem serem registradas ou inspecionadas além do formato público, exceto pelo token sintético canônico isolado pelo contrato B119.

## Variáveis proibidas no frontend

Nunca exponha por `VITE_*`:

- `service_role`;
- `sb_secret_*`;
- segredo de webhook;
- chave privada de provider de pagamento;
- credencial SMTP;
- token administrativo;
- senha de banco.

## Desenvolvimento local

```bash
npm ci
npm run dev
```

Use somente o `.env` local ignorado pelo Git. Não crie ou versione `.env.development`, `.env.production`, `.env.local` ou `.env.staging`.

Não use `VITE_CI_RUNTIME_SMOKE` no desenvolvimento local. Essa variável pertence exclusivamente ao workflow técnico e não substitui uma chave publishable ativa.

## Gates

```bash
npm run check:environment
npm run lint
npm run typecheck
npm run build
```

`check:environment` verifica arquivos versionados, referências legadas no runtime, hardcode no cliente e vínculo do Supabase CLI ao ambiente `dev`.

O build valida também a correspondência entre revisão esperada, runtime compilado e `dist/release.json`. No workflow técnico, o smoke B118 executa o bundle com a configuração sintética B119 e bloqueia qualquer raiz React não hidratada.

## Produção

As variáveis de produção serão fornecidas pela plataforma de hospedagem somente à branch `main`. Nenhuma credencial de produção deve ser copiada para `dev`, arquivos locais compartilhados ou GitHub Actions.

A configuração sintética do CI é explicitamente proibida na branch `main` e não pode ser usada como fallback de produção.

## Rotação e incidente

A chave publicável encontrada no histórico do projeto legado não é administrativa, mas deverá ser avaliada e rotacionada antes da desativação daquele projeto. Qualquer segredo administrativo encontrado deverá ser revogado imediatamente e tratado como incidente.

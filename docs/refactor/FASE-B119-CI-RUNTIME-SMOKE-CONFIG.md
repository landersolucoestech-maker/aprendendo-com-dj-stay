# FASE B119 — Configuração isolada do smoke de runtime

## Problema comprovado

O build de qualidade da branch `dev` referenciava o secret `SUPABASE_DEV_PUBLISHABLE_KEY`, mas esse valor não estava configurado no GitHub Actions. O Vite ainda produzia os arquivos estáticos porque a configuração pública é validada somente quando o JavaScript inicia no navegador.

O B118 comprovou o efeito real: o HTML, os chunks e o `release.json` eram entregues, porém `publicConfig` lançava antes de `createRoot`, mantendo `#root` vazio nas três rotas públicas.

## Decisão

O gate de qualidade passa a usar uma configuração sintética e determinística exclusivamente para executar o bootstrap do frontend no Chrome headless:

- `VITE_APP_ENV=development`;
- `VITE_CI_RUNTIME_SMOKE=true`;
- token sintético canônico sem validade no Supabase;
- project ref real de `dev`, sem chave real versionada.

Esse artefato existe somente para lint, testes, typecheck, build, smoke HTTP e smoke de navegador. Ele não é um artefato de implantação e não pode autenticar ou consultar o Supabase como cliente autorizado.

## Barreiras de segurança

`src/config/public-config.ts` aceita o token sintético somente quando todas as condições abaixo forem verdadeiras:

1. a flag possui exatamente o valor `true`;
2. o ambiente declarado é `development`;
3. o modo Vite é `development`;
4. o valor recebido é exatamente o token sintético canônico.

A configuração é rejeitada quando:

- o token sintético aparece sem a flag;
- a flag aparece com uma chave normal;
- a flag possui qualquer valor diferente de `true`;
- o token sintético aparece em `production`;
- o build de produção tenta reutilizar o modo de smoke.

Builds locais reais, homologação remota e produção continuam exigindo uma chave publishable ativa fornecida pelo ambiente e nunca versionada.

## Contrato permanente

O gate `scripts/check-ci-runtime-smoke-config.mjs` verifica:

- token e flag canônicos no código e no workflow;
- ausência do secret vazio no estágio de qualidade;
- restrição exclusiva a `development`;
- cobertura unitária dos caminhos de aceitação e rejeição;
- tipagem da variável Vite;
- documentação explícita de que o artefato não é implantável;
- ausência de qualquer chave real Supabase no repositório.

## Exclusões

- Nenhuma migration foi criada ou alterada.
- O Supabase remoto não foi modificado.
- A branch `main` não foi alterada.
- Nenhuma chave ativa foi versionada, exibida em issue ou gravada em artefato.
- Nenhuma dependência ou lockfile foi alterado.
- A aprovação em `dev` não equivale a homologação externa ou promoção para produção.

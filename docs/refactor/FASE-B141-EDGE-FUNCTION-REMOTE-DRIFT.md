# FASE B141 — Drift remoto das Edge Functions

## Objetivo

Confrontar o código das Edge Functions versionado na branch `dev` com as versões implantadas no Supabase remoto de desenvolvimento e corrigir somente o drift comprovado, sem redeploy indiscriminado e sem alterar produção.

## Escopo

- GitHub: `landersolucoestech-maker/aprendendo-com-dj-stay`, branch `dev`;
- Supabase remoto de desenvolvimento: `jmtyurketfclaneqxohu`;
- Supabase principal e branch GitHub `main`: somente leitura, sem alterações.

## Inventário remoto antes da correção

| Função | Versão | `verify_jwt` | Resultado do confronto |
| --- | ---: | --- | --- |
| `media-playback` | 2 | `false` | defasada em relação ao B77 |
| `asaas-webhook` | 1 | `false` | alinhada ao único commit do arquivo |
| `create-asaas-checkout` | 1 | `true` | alinhada ao único commit do arquivo |

`verify_jwt=false` foi preservado em `media-playback` e `asaas-webhook` porque ambas implementam autenticação própria:

- playback: origem permitida, token efêmero e fingerprint;
- webhook: token secreto do Asaas comparado em tempo constante.

O checkout continua com validação JWT nativa habilitada.

## Defeito encontrado

A versão remota 2 de `media-playback` convertia diretamente a resposta da RPC para a interface TypeScript:

```ts
const resolution = value as PlaybackResolution;
```

Essa conversão não valida dados em runtime. Um payload SQL inesperado poderia atravessar a fronteira como se estivesse correto.

O código versionado desde o B77 usa `parsePlaybackResolution` de `_shared/playback-contract.ts`. O parser:

- exige exatamente as chaves contratadas;
- restringe providers e motivos de negação;
- valida limites de strings e timestamps;
- restringe embeds do YouTube a `www.youtube-nocookie.com/embed/...`;
- restringe embeds do Vimeo a `player.vimeo.com/video/...`;
- exige bucket, caminho e MIME coerentes para mídia privada;
- falha fechado com `PLAYBACK_RESOLUTION_FAILED` quando a RPC retorna contrato inválido.

O histórico confirmou que `media-playback/index.ts` foi alterado em `2026-08-02` no commit `becb9168238d4932bdef8f96f25cbc7e5e70948a`, depois da última implantação remota registrada em `2026-07-30`. Checkout e webhook não receberam alterações posteriores às implantações de `2026-07-31`.

## Correção aplicada

Somente `media-playback` foi reimplantada no Supabase remoto `dev` com:

- `media-playback/index.ts`;
- `media-playback/deno.json`;
- `_shared/playback-contract.ts`;
- entrypoint `media-playback/index.ts`;
- configuração Deno específica da função;
- `verify_jwt=false` preservado por desenho.

## Evidências pós-implantação

- versão remota: `3`;
- status: `ACTIVE`;
- SHA do bundle remoto: `99a1a4a73182cebeeedc620080b36914f4ce745a97c043471752b77032fe28bb`;
- import compartilhado presente no código implantado;
- parser compartilhado presente no bundle implantado;
- `deno.json` presente e associado à função;
- `asaas-webhook` permaneceu na versão `1`;
- `create-asaas-checkout` permaneceu na versão `1`;
- advisor de segurança executado após o deploy: zero lints;
- consulta aos logs de Edge Functions após o deploy: nenhum registro retornado, portanto nenhum erro de boot foi observado, mas também não houve invocação registrada nessa janela.

## Limitação da prova

O terminal desta sessão não conseguiu resolver DNS público para o domínio do projeto, e o banco remoto não possui `pg_net` ou `http` instalados. Nenhuma extensão foi instalada apenas para fabricar um smoke.

Consequentemente, esta fase comprova:

- alinhamento do bundle implantado;
- compilação e ativação pela plataforma;
- presença integral do parser e das dependências;
- ausência de lint de segurança.

Esta fase não declara como concluído:

- reprodução autenticada de uma mídia real;
- assinatura e streaming de um objeto privado real;
- embed real de YouTube ou Vimeo;
- teste E2E com matrícula ativa;
- pentest.

## Resultado

O drift comprovado de `media-playback` foi eliminado no Supabase remoto `dev`. As outras Edge Functions não foram redeployadas porque não havia alteração versionada posterior às implantações existentes. Produção permaneceu intacta.
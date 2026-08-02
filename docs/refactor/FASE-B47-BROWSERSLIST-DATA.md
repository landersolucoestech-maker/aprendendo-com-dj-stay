# Fase B47 — Atualização determinística do Browserslist

## Objetivo

Eliminar o aviso de base Browserslist desatualizada no build sem ampliar o escopo para upgrades funcionais desnecessários de dependências.

## Atualização realizada

O `package-lock.json` foi regenerado no runner oficial com:

```bash
npx --yes update-browserslist-db@1.2.3
```

Resultado:

- `caniuse-lite`: `1.0.30001669` → `1.0.30001806`;
- `browserslist`: preservado em `4.24.2`;
- somente três campos do pacote `caniuse-lite` foram alterados no lockfile: versão, URL resolvida e integridade SHA-512.

A atualização foi realizada por uma etapa temporária do GitHub Actions porque o ambiente de execução local não tinha acesso de rede ao registro npm. O runner criou um commit `[skip ci]` contendo exclusivamente o `package-lock.json`. A etapa temporária foi removida imediatamente depois.

## Gate permanente

`scripts/check-browserslist-data.mjs` valida:

- presença de `node_modules/caniuse-lite` no lockfile;
- versão exata `1.0.30001806`;
- URL resolvida coerente com a versão;
- integridade SHA-512;
- presença de Browserslist no lockfile;
- ausência da etapa temporária e de `update-browserslist-db` no workflow técnico.

O comando `npm run check:browserslist-data` integra `npm run typecheck`.

## Política de manutenção

A base não será atualizada automaticamente a cada execução do CI. Atualizações futuras devem ser deliberadas e versionadas, pois alterações no conjunto de navegadores suportados podem modificar o CSS gerado, os prefixes do Autoprefixer e a compatibilidade efetiva do frontend.

## Critérios de aceite

- `npm ci` reproduz o lockfile;
- gate B47 aprovado;
- lint e TypeScript aprovados;
- build sem a advertência de base Browserslist desatualizada;
- contratos de chunks e artefato de release preservados.

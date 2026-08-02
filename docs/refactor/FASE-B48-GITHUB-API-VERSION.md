# Fase B48 — Versionamento explícito da API GitHub no CI

## Objetivo

Eliminar a advertência de depreciação emitida pela criação automática da issue de evidência do gate técnico e tornar explícito o contrato HTTP usado pelo workflow.

## Problema confirmado

O workflow `.github/workflows/baseline.yml` utilizava o helper `github.rest.issues.create`, que delegava a seleção da versão da API GitHub ao runtime da action. Essa chamada passou a emitir advertência de depreciação, apesar de continuar funcional.

A correção não altera o conteúdo da evidência, os critérios do gate, permissões do workflow, aplicação, banco de dados, Edge Functions ou ambientes Supabase.

## Implementação

A criação da issue de evidência passou a utilizar:

```javascript
await github.request("POST /repos/{owner}/{repo}/issues", {
  owner: context.repo.owner,
  repo: context.repo.repo,
  title: `Gate técnico — ${context.sha.slice(0,12)}`,
  body,
  headers: {
    accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2026-03-10"
  }
});
```

Foram preservados:

- título baseado no SHA validado;
- URL da execução;
- resultados de instalação, lint, banco e pgTAP, geração de tipos, TypeScript e build;
- criação da evidência mesmo quando uma etapa anterior falha;
- bloqueio final quando qualquer etapa obrigatória não termina com sucesso.

## Gate estático

O arquivo `scripts/check-github-api-version.mjs` valida:

- uso de `github.request("POST /repos/{owner}/{repo}/issues"`;
- presença do media type oficial `application/vnd.github+json`;
- versão explícita `2026-03-10`;
- ausência do helper implícito `github.rest.issues.create`;
- existência de exatamente um cabeçalho `X-GitHub-Api-Version`;
- preservação dos campos essenciais da evidência técnica.

O comando `npm run check:github-api-version` integra `npm run typecheck` e, por consequência, o gate consolidado `npm run check`.

## Evidências

- Issue de execução: `#405 — B48 — versionamento explícito da API GitHub no CI`;
- implementação do request versionado: commit `c60ff0e4d7c4ca1e6683e45bc4cf685ed7be9277`;
- criação do gate estático: commit `0938e92d83d8ab0616fd0718c50fec7ba7499a12`;
- integração do gate ao typecheck: commit `fc7cad779567951cc60d35a24d41b01583a9689e`;
- gate integral aprovado: issue `#408`, run `30729596399`.

## Banco e ambientes

- nenhuma migration criada ou aplicada;
- nenhum dado alterado;
- projeto Supabase `dev` inalterado;
- projeto Supabase `main` inalterado;
- branch GitHub `main` inalterada.

## Critérios de aceite

- chamada REST com versão de API explícita;
- media type oficial configurado;
- conteúdo da issue de evidência preservado;
- gate estático integrado ao typecheck;
- documentação versionada na branch `dev`;
- gate técnico integral aprovado.

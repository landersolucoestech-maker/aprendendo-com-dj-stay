# FASE B29 — Higiene do repositório e manifesto de fontes

## Objetivo

Impedir que arquivos locais, credenciais, chaves privadas, saídas de build ou artefatos gerados sejam incorporados à branch `dev`, além de produzir uma impressão digital determinística do código versionado.

## Contratos

- A auditoria considera exclusivamente arquivos retornados por `git ls-files`.
- Arquivos `.env`, chaves privadas, certificados privados, diretórios de dependências, saídas de build e artefatos gerados não podem estar versionados.
- Arquivos individuais não podem exceder 10 MiB.
- Arquivos textuais são verificados contra padrões fortes de:
  - chaves privadas PEM/OpenSSH;
  - tokens GitHub;
  - AWS access keys;
  - Supabase secret keys;
  - Stripe live secrets;
  - OpenAI secret keys;
  - JWTs Supabase com papel `service_role`.
- O gate não usa heurística genérica de entropia, evitando bloquear conteúdo legítimo sem evidência de credencial.
- O diretório `artifacts/` é ignorado pelo Git e permanece disponível para exportação no CI.

## Manifesto de fontes

O arquivo `artifacts/source-manifest.json` é gerado deterministicamente com:

- nome e versão da aplicação;
- quantidade total de arquivos versionados;
- tamanho total em bytes;
- caminho, tamanho e SHA-256 de cada arquivo;
- SHA-256 agregado do conjunto completo.

O manifesto não inclui horário, hostname, caminho absoluto ou dado do runner. O mesmo commit gera o mesmo manifesto.

## Gate

```bash
npm run check:repository-hygiene
```

O comando integra o `typecheck` e bloqueia o gate técnico da branch `dev` caso qualquer contrato seja violado.

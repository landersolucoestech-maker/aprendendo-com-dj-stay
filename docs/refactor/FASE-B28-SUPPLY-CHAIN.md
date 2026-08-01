# FASE B28 — Integridade da cadeia de dependências e SBOM

## Objetivo

Garantir que o código instalado no ambiente de desenvolvimento seja reproduzível a partir do `package-lock.json`, tenha origem verificável e produza inventário de componentes consumível por ferramentas de segurança.

## Contratos

- `package-lock.json` deve permanecer na versão 3.
- Dependências diretas do manifesto e da entrada raiz do lockfile devem ser idênticas.
- Dependências locais por `file:`, `link:` ou `workspace:` não são aceitas neste repositório.
- Dependências por Git ou HTTP sem TLS não são aceitas.
- Pacotes publicados devem ser resolvidos pelo registry oficial do npm.
- Pacotes instalados devem possuir integridade SHA-256, SHA-384 ou SHA-512 registrada no lockfile.
- O projeto não pode executar `postinstall` automático na instalação limpa.
- O gate deve produzir `artifacts/sbom.cdx.json` em CycloneDX 1.5.

## SBOM

O SBOM é gerado exclusivamente a partir do lockfile versionado. Ele não inclui timestamp, hostname ou valores do runner, para que o resultado seja determinístico para o mesmo commit.

Cada componente inclui:

- nome e versão;
- Package URL (`purl`);
- hash de integridade convertido do SRI do npm;
- URL de distribuição;
- caminho no lockfile;
- indicadores de dependência de desenvolvimento e opcional.

## Gate

O comando é:

```bash
npm run check:supply-chain
```

Ele integra o `typecheck`, portanto qualquer divergência do lockfile, origem insegura, integridade ausente ou falha de geração do SBOM bloqueia o gate técnico da branch `dev`.

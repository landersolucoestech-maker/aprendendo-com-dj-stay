# Fase B53 — Testes unitários de metadados do usuário

## Objetivo

Proteger o processamento de `user_metadata`, uma entrada controlável pelo usuário que alimenta nome, telefone, biografia e links públicos do perfil.

## Risco coberto

Os metadados do Supabase Auth não podem ser usados como fonte de autorização. Nesta aplicação, eles são utilizados apenas para apresentação de perfil, mas ainda precisam de validação rigorosa para impedir:

- protocolos inseguros em links públicos;
- URLs incompletas ou inválidas;
- textos acima dos limites definidos;
- exposição acidental de campos desconhecidos;
- regressões na cadeia de fallback do nome;
- falhas silenciosas quando o payload não é um objeto válido.

## Suíte

O arquivo `src/auth/user-metadata.test.ts` cobre:

- prioridade de `full_name` sobre `name` e e-mail;
- fallback para `name`, prefixo do e-mail e `Aluno`;
- trim de campos textuais;
- defaults vazios para telefone, bio e links;
- aceitação de URLs HTTPS completas;
- rejeição de HTTP, JavaScript, FTP e URLs sem protocolo;
- limites de 120 caracteres para nome e 1.000 para bio;
- retorno de `DataContractError` com contexto e paths das issues;
- rejeição de `user_metadata` nulo;
- descarte de campos desconhecidos da projeção retornada, mesmo quando o schema permite passthrough.

## Contrato permanente

`scripts/check-user-metadata-tests.mjs` valida a permanência:

- dos limites e da exigência HTTPS no código de produção;
- dos principais casos negativos e fallbacks na suíte;
- do script npm dedicado;
- da integração do contrato B53 ao `typecheck`.

A execução real dos testes continua centralizada em `npm run test:unit`, criado na fase B52.

## Escopo excluído

- nenhuma mudança no formato público do perfil;
- nenhuma mudança de autorização ou papel;
- nenhuma dependência nova;
- nenhuma migration, dado ou Edge Function alterada;
- nenhum uso de `user_metadata` para decisões de autorização.

## Critérios de aceite

- suíte unitária completa aprovada;
- contrato B53 aprovado;
- lint aprovado;
- banco e pgTAP aprovados;
- tipos sincronizados;
- TypeScript aprovado;
- build aprovado;
- Supabase e branch `main` inalterados.

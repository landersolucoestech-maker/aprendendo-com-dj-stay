# Fase B68 — Contratos de certificados e elegibilidade

## Objetivo

Endurecer os contratos Zod de certificados, validação pública, conclusão de matrícula e painel administrativo, adicionando cobertura unitária determinística alinhada aos constraints e cálculos já existentes no PostgreSQL.

## Problemas tratados

Os modelos aceitavam campos extras e validavam partes isoladas sem garantir coerência semântica entre elas.

Isso permitia aceitar payloads impossíveis, como:

- certificado emitido com dados de revogação;
- certificado revogado sem horário ou motivo;
- validação pública marcada como válida para certificado revogado;
- percentual divergente das contagens de aulas;
- elegibilidade divergente do status, configuração ou percentual;
- matrícula administrativa com apenas identificador ou código de certificado ativo;
- conclusão calculada para outra matrícula, usuário ou curso.

## Implementação

`src/contracts/certificates.ts` passa a compartilhar:

- código no formato `DJSTAY-` seguido de 20 caracteres hexadecimais maiúsculos;
- timestamps com timezone ou offset;
- snapshots de nome e título entre 2 e 200 caracteres após trim;
- percentuais inteiros entre 0 e 100;
- motivo de revogação entre 3 e 1000 caracteres quando presente.

Todos os objetos de certificado, validação, conclusão e administração passam a ser estritos.

### Estado de revogação

- `issued` exige `revoked_at` e `revocation_reason` nulos;
- `revoked` exige horário e motivo válidos.

### Validação pública

- resultado não encontrado contém apenas `found: false` e `valid: false`;
- resultado encontrado exige `valid` coerente com `status === issued`.

### Conclusão e elegibilidade

O contrato reproduz o cálculo da RPC:

- zero aulas resulta em zero por cento;
- caso contrário, o percentual é o arredondamento de concluídas sobre total, limitado a 100;
- concluídas não podem exceder o total;
- elegibilidade exige matrícula ativa, certificado habilitado e modo manual ou percentual mínimo atingido.

### Administração

- aluno, curso, matrícula, certificado e dashboard são estritos;
- e-mail administrativo pode ser nulo conforme `auth.users`;
- identificador e código do certificado ativo devem existir em conjunto;
- a conclusão aninhada deve corresponder à matrícula, usuário, curso, status e título externos.

## Testes

`src/contracts/certificates.test.ts` cobre:

- enums canônicos e valores inválidos;
- certificados emitidos e revogados;
- normalização e limites dos snapshots e motivos;
- códigos, percentuais, timestamps e campos extras;
- validação pública encontrada e não encontrada;
- divergência entre validade e status;
- cálculo de percentual e modo manual;
- contagens e elegibilidade inválidas;
- aluno, curso, matrícula e certificado administrativos;
- par do certificado ativo;
- conclusão pertencente a outra matrícula;
- dashboard e objetos aninhados estritos.

## Contrato permanente

`scripts/check-certificate-contract-tests.mjs` verifica:

- primitivas e refinamentos obrigatórios;
- alinhamento com os constraints do schema B21;
- alinhamento com cálculo, validação e painel das RPCs B21;
- cenários negativos obrigatórios da suíte;
- documentação e integração ao `typecheck`.

## Escopo excluído

- Nenhuma migration;
- nenhuma alteração de schema ou dados;
- nenhuma alteração em RPCs, hooks ou páginas;
- nenhuma emissão ou revogação real de certificado;
- nenhuma escrita no Supabase remoto;
- nenhuma alteração na branch `main`.

## Critérios de aceite

- contrato B68 aprovado;
- lint aprovado;
- testes unitários aprovados;
- banco local e pgTAP aprovados;
- tipos sincronizados;
- TypeScript aprovado;
- build aprovado.

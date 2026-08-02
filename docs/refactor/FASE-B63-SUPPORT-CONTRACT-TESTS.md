# Fase B63 — Contratos de suporte

## Objetivo

Endurecer os contratos Zod do sistema de tickets de suporte e adicionar cobertura unitária determinística alinhada aos constraints já existentes no PostgreSQL.

## Problemas tratados

Os contratos de leitura e mutação aceitavam campos extras, tratavam timestamps apenas como strings genéricas e não reproduziam no frontend os limites de referência e texto garantidos pelo banco.

Isso permitia que respostas divergentes das RPCs fossem aceitas silenciosamente, inclusive timestamps inválidos, referências fora do padrão e propriedades internas não previstas pela interface.

## Implementação

`src/contracts/support.ts` passa a compartilhar:

- timestamp ISO com timezone ou offset;
- referência no formato `SUP-` seguida de 16 caracteres hexadecimais maiúsculos;
- assunto entre 5 e 200 caracteres após trim;
- categoria entre 2 e 80 caracteres após trim;
- mensagem entre 2 e 5000 caracteres após trim.

Todos os objetos de mensagem, ticket, listas, dashboard administrativo e resultado de mutação passam a ser estritos.

A extensão administrativa preserva os campos adicionais autorizados:

- `user_id` como UUID;
- `customer_email` como e-mail válido ou nulo.

## Testes

`src/contracts/support.test.ts` cobre:

- status, prioridades e papéis de autor;
- mensagens válidas, trim, limites, UUID e timestamp;
- referência, assunto, categoria e campos extras do ticket;
- listas do aluno e coerção controlada de contagens;
- ticket e dashboard administrativos;
- retornos de criação, mensagem e mudança de status;
- rejeição de payloads internos adicionais.

## Contrato permanente

`scripts/check-support-contract-tests.mjs` verifica:

- alinhamento dos contratos com os constraints da migration B39;
- uso obrigatório de timestamp com offset;
- padrão da referência;
- limites textuais;
- objetos estritos;
- cenários negativos da suíte;
- documentação e integração ao `typecheck`.

## Escopo excluído

- Nenhuma migration;
- nenhuma alteração de schema ou dados;
- nenhuma alteração em RPCs ou páginas;
- nenhuma escrita no Supabase remoto;
- nenhuma alteração na branch `main`.

## Critérios de aceite

- contrato B63 aprovado;
- lint aprovado;
- testes unitários aprovados;
- banco local e pgTAP aprovados;
- tipos sincronizados;
- TypeScript aprovado;
- build aprovado.

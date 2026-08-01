# Auditoria técnica

A auditoria é executável. A fonte principal de evidência não é uma checklist manual, mas o conjunto versionado de migrations, testes pgTAP, contratos estáticos e gates do repositório.

## Evidências

- `supabase/migrations`: evolução canônica do banco;
- `supabase/tests`: segurança, integridade, grants, RLS e comportamento do domínio;
- `scripts/check-*.mjs`: contratos de arquitetura, frontend, segurança e supply chain;
- `docs/refactor`: decisões e resultados por fase;
- `docs/STATUS.md`: estado operacional consolidado.

## Execução

```bash
npm ci
npm run check
```

O gate deve reconstruir o Supabase localmente. Aprovação obtida apenas contra um banco remoto previamente alterado não é evidência suficiente.

## Limites

A auditoria automatizada não substitui:

- homologação do provider de pagamento;
- pentest independente;
- teste de carga com volume representativo;
- revisão jurídica, fiscal ou de proteção de dados;
- validação de produção após promoção autorizada.

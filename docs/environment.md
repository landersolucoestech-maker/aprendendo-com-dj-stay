# Configuração de ambientes

## Princípios

- o frontend recebe somente configuração pública;
- segredos permanecem exclusivamente em backend, Edge Functions ou secret manager;
- não existe fallback silencioso entre ambientes;
- o projeto legado `uonsgcndzzuclcixoaei` é proibido como runtime;
- arquivos `.env` são locais e não são versionados.

## Mapeamento obrigatório

| GitHub | Supabase | Project ref |
| --- | --- | --- |
| `dev` | branch de desenvolvimento | `jmtyurketfclaneqxohu` |
| `main` | produção | `tduvfrxagujryfnqpdmc` |

Produção permanece somente leitura durante a auditoria e a refatoração.

## Variáveis públicas do frontend

O arquivo `.env` local deverá definir:

```text
VITE_SUPABASE_URL=<URL pública do ambiente correto>
VITE_SUPABASE_PUBLISHABLE_KEY=<chave publicável do ambiente correto>
```

A aplicação deverá falhar explicitamente na Fase B4 quando:

- uma variável estiver ausente;
- a URL for inválida;
- o project ref não corresponder ao ambiente;
- houver referência ao projeto legado;
- uma chave privilegiada for detectada no frontend.

## Variáveis proibidas no frontend

Nunca exponha por `VITE_*`:

- `service_role`;
- secret key do Supabase;
- segredo de webhook;
- chave privada de provider de pagamento;
- credencial SMTP;
- token administrativo;
- senha de banco.

## Desenvolvimento local

```bash
npm ci
npm run dev
```

O `.env` local deve apontar exclusivamente para `jmtyurketfclaneqxohu`. Não crie ou versione `.env.development`, `.env.production`, `.env.local` ou `.env.staging`.

## Produção

As variáveis de produção deverão ser fornecidas pela plataforma de hospedagem somente à branch `main`. Nenhum valor de produção deve ser copiado para o repositório.

## Rotação e incidente

A chave publicável legada encontrada no histórico não é uma credencial administrativa, mas deverá ser avaliada e rotacionada antes da desativação do projeto legado. Qualquer segredo administrativo encontrado deverá ser revogado imediatamente e tratado como incidente.

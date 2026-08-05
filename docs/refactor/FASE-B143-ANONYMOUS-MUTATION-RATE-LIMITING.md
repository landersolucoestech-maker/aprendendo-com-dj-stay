# FASE B143 — Limitação das mutações anônimas

## Objetivo

Impedir abuso persistente das duas RPCs públicas que gravam dados sem autenticação, mantendo os fluxos `/contato` e `/r/:code`, sem confiar em identificadores enviados pelo cliente e sem armazenar endereço IP bruto.

## Escopo

- GitHub: `landersolucoestech-maker/aprendendo-com-dj-stay`, branch `dev`;
- Supabase remoto `dev`: project ref `jmtyurketfclaneqxohu`;
- projeto Supabase principal `tduvfrxagujryfnqpdmc` e branch GitHub `main`: sem alterações.

## Defeito comprovado

As RPCs `submit_contact_message` e `record_affiliate_click` eram executáveis por `anon` e inseriam em `contact_messages` e `affiliate_clicks` sem quota temporal por origem.

A idempotência existente bloqueava apenas a repetição do mesmo UUID. Uma prova transacional demonstrou que duas submissões anônimas, com chaves distintas e o mesmo e-mail, eram aceitas imediatamente. A transação foi revertida e nenhum dado de prova permaneceu no ambiente.

O contrato TypeScript de contato já reconhecia `RATE_LIMITED`, mas o PostgreSQL nunca produzia esse resultado. Portanto, a interface prometia uma proteção que não existia.

## Desenho aplicado

A correção permanece no PostgreSQL e usa o contexto entregue pelo PostgREST:

1. lê `request.method` e `request.headers`;
2. prioriza `cf-connecting-ip`, usa `x-real-ip` quando o cabeçalho específico da borda está ausente e aceita `x-forwarded-for` apenas como fallback final;
3. normaliza a origem como `inet`;
4. pseudonimiza a origem com HMAC-SHA256 e um segredo aleatório de 32 bytes gerado dentro do banco;
5. persiste somente o hash, o escopo, o início da janela, o contador e a expiração;
6. serializa atualizações concorrentes com advisory lock transacional;
7. elimina no máximo 100 contadores expirados por chamada aceita;
8. falha fechado quando uma mutação HTTP não possui origem válida;
9. não aplica quota a operações internas sem contexto HTTP;
10. não consome quota quando o JWT possui papel `service_role`.

A precedência reduz a influência de valores encaminhados pelo cliente quando o gateway fornece um cabeçalho de origem mais específico. A prova altera `x-forwarded-for` e `x-real-ip` mantendo `cf-connecting-ip` estável e exige que a chamada permaneça na mesma quota. Quando `cf-connecting-ip` não existe, a mesma prova exige precedência de `x-real-ip`; somente na ausência de ambos é usado o primeiro endereço de `x-forwarded-for`.

Nenhum endereço IP bruto é persistido. O segredo HMAC e os contadores ficam no schema `private`, com RLS, revogação integral de privilégios diretos e políticas explícitas de negação para `anon` e `authenticated`.

## Quotas

- contato: cinco submissões em quinze minutos por origem pseudonimizada;
- afiliado: cento e vinte cliques em dez minutos por origem pseudonimizada.

As duas tabelas públicas são protegidas por triggers `BEFORE INSERT`. Isso cobre tanto as RPCs atuais quanto qualquer novo caminho futuro que tente inserir diretamente nessas tabelas.

## Migrations

- `20260805022138_anonymous_mutation_rate_limiting.sql`;
- `20260805022356_anonymous_mutation_rate_limit_rls_policies.sql`;
- `20260805023924_anonymous_mutation_rate_limit_origin_precedence.sql`.

A primeira migration cria o segredo, o estado de quota, os helpers privados e os dois triggers. A segunda adiciona políticas `DENY ALL` explícitas para os papéis não privilegiados. A terceira corrige a precedência da identidade de origem sem reescrever o histórico já aplicado.

## Provas remotas

A validação transacional persistida no Supabase remoto `dev` comprovou:

- cinco contatos aceitos para uma origem;
- sexta submissão bloqueada com `RATE_LIMITED`;
- outra origem aceita em contador independente;
- mutação HTTP sem origem bloqueada com `RATE_LIMIT_CONTEXT_REQUIRED`;
- cento e vinte consumos no escopo de afiliado aceitos e o seguinte bloqueado;
- contexto `service_role` sem consumo de quota anônima;
- `cf-connecting-ip` estável mantém a mesma quota mesmo com `x-real-ip` e `x-forwarded-for` diferentes;
- origem `cf-connecting-ip` diferente recebe contador independente;
- `x-real-ip` prevalece sobre `x-forwarded-for` quando o cabeçalho específico da borda está ausente;
- `x-forwarded-for` é usado apenas quando os dois cabeçalhos prioritários estão ausentes;
- dois triggers instalados;
- identificadores persistidos com 32 bytes;
- nenhum endereço IP bruto presente no estado;
- duas tabelas privadas com RLS habilitado;
- zero privilégio direto de tabela ou função para `anon`;
- advisor de segurança com zero lints após as políticas explícitas.

Todas as provas de escrita foram executadas dentro de transações revertidas.

## Testes e contrato

O arquivo `supabase/tests/anonymous_mutation_rate_limiting.test.sql` contém 24 asserções pgTAP para catálogo, privilégios, RLS, comportamento real sob `anon`, independência por origem, precedência dos cabeçalhos, falha fechada, bypass de serviço, HMAC e expiração.

O verificador `scripts/check-anonymous-mutation-rate-limiting.mjs` está encadeado ao `typecheck` pelo contrato obrigatório de contatos. Ele bloqueia a remoção silenciosa das migrations, triggers, quotas, precedência de origem, testes, privacidade do identificador e mensagens públicas.

O frontend passou a mapear somente os tokens conhecidos `RATE_LIMITED`, `RATE_LIMIT_CONTEXT_REQUIRED` e `RATE_LIMIT_CONTEXT_INVALID` para mensagens seguras. Objetos PostgREST desconhecidos continuam usando fallback, sem exposição de detalhes internos do banco.

## Limitações

A limitação por origem reduz spam automatizado e explosões acidentais, mas não substitui CAPTCHA, firewall, WAF ou análise comportamental distribuída. Uma rede de proxies ainda pode distribuir requisições entre múltiplas origens.

A confiança na precedência considera que o gateway controla ou sobrescreve os cabeçalhos de borda. Se a infraestrutura de entrega for alterada, esse contrato precisa ser revalidado contra os cabeçalhos efetivamente produzidos pelo novo proxy.

A branch de desenvolvimento permanece sem massa operacional de usuários, cursos, aulas, assets e matrículas. Portanto, o E2E autenticado de playback continua bloqueado sem fabricar dados.

## Resultado

As duas mutações anônimas graváveis agora possuem quota por origem pseudonimizada, precedência conservadora dos cabeçalhos, concorrência serializada, retenção limitada, falha fechada e estado inacessível aos clientes. O Supabase de produção permaneceu intacto e nenhuma promoção da branch `main` foi realizada. A produção permaneceu intacta.

# FASE B132 — isolamento de rede na navegação client-side

## Problema comprovado

O smoke B125 validava a troca client-side da home para `/login`, o fallback lazy e a transferência de foco, mas não persistia os eventos `Network.requestWillBeSent` e `Network.responseReceived`. O verificador B128 era executado antes dessa transição e, por isso, cobria somente os oito carregamentos diretos.

## Correção aplicada

- `scripts/run-browser-client-navigation-smoke.mjs` agora registra a rede desde o `Document` inicial da home até o conteúdo final de `/login`.
- Cada evento recebe a fase `initial-document` ou `client-navigation`.
- O artefato `client-navigation.network.json` é sempre persistido junto aos artefatos de foco, runtime e HTML.
- A transição contém um único marcador explícito `client-navigation` com destino `/login`.
- O smoke bloqueia respostas HTTP com status maior ou igual a 400.
- A limpeza do perfil temporário do Chrome possui repetição limitada apenas para `ENOTEMPTY`, `EBUSY` e `EPERM`; falhas funcionais não são repetidas nem ignoradas.

## Gate bloqueante

O workflow executa, nesta ordem:

1. smoke das oito rotas públicas;
2. smoke client-side home → `/login`;
3. verificação consolidada de rede.

`scripts/check-browser-network-isolation.mjs` exige exatamente nove artefatos de rede: oito rotas diretas e `client-navigation.network.json`.

Para a navegação client-side, o gate exige:

- exatamente um `Document`, correspondente à home `/`;
- nenhuma requisição `Document` durante a fase `client-navigation`;
- origem loopback com porta efêmera explícita;
- todas as requisições HTTP/HTTPS na mesma origem e porta do documento inicial;
- exatamente um marcador de transição para `/login`;
- nenhuma resposta HTTP com status maior ou igual a 400.

O resumo `external-network-summary.json` inclui os nove artefatos, contagens de requisições e respostas, documentos da transição, origens externas e respostas HTTP falhas.

## Limites

- Nenhuma migration foi criada ou alterada.
- Supabase remoto não foi modificado.
- Nenhuma dependência ou lockfile foi alterado.
- Nenhuma exceção de rede foi adicionada.

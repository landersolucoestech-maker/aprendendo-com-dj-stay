# Refatoração sequencial

As fases deste diretório registram decisões técnicas e garantias adicionadas à branch `dev`. A numeração expressa dependência de execução; não autoriza trabalho paralelo nem promoção automática para produção.

## Princípios

- uma causa observada por vez;
- migrations e contratos versionados antes de declarar conclusão;
- nenhum bypass de lint ou desativação de segurança para obter gate verde;
- Supabase de produção somente leitura até autorização explícita;
- índices não são removidos com base em um banco de desenvolvimento sem tráfego;
- implementação em `dev` não equivale a homologação externa ou produção.

## Fases consolidadas

A sequência cobre, entre outros domínios:

- ambiente, autenticação, autorização e storage;
- cursos, currículo, matrículas, player e progresso;
- marketplace, pagamentos, afiliados e certificados;
- contatos e observabilidade;
- verdade operacional, design system e acessibilidade;
- performance, datas, dependências e supply chain;
- higiene do repositório, hardening do banco e integridade dos chunks;
- proveniência e entrega HTTP do artefato público;
- redação da saída local do Supabase CLI no CI;
- execução do frontend em Chrome headless por CDP;
- matriz de oito rotas públicas com conteúdo final;
- reconciliação de landmark após substituições do `Suspense`;
- prontidão de `#main-content`, `tabindex="-1"`, skip link e live region antes da coleta do DOM;
- foco diferido nos fallbacks lazy e transferência para o conteúdo final;
- recuperação de foco quando o target final previamente focado é substituído;
- catálogo sintético canônico validado pelo mesmo schema Zod da RPC real;
- zero chamada à RPC e zero rede Supabase remota no build sintético;
- bloqueio de respostas HTTP com status igual ou superior a 400;
- remoção de Google Fonts e adoção de stack tipográfica nativa;
- isolamento das oito rotas à origem e porta exatas do documento servido;
- persistência da rede completa da navegação client-side home → `/login`;
- exatamente nove artefatos de rede: oito rotas diretas e uma transição client-side;
- proibição de um segundo `Document` durante a troca client-side;
- limpeza limitada do perfil temporário dentro de cada smoke do Chrome;
- proibição de reexecutar o smoke inteiro para contornar `ENOTEMPTY`;
- verdade documental bloqueante para o commit, issue e run integrais mais recentes;
- diagnósticos persistentes de TypeScript e navegador com `set -o pipefail`;
- sincronização comprovada das migrations versionadas com o Supabase remoto `dev`, incluindo contratos, `pg_cron`, jobs ativos, execução observada e advisor de segurança limpo;
- confronto das Edge Functions remotas com o GitHub, correção seletiva do drift de `media-playback` e validação runtime do contrato SQL por parser compartilhado fail-closed;
- revogação de `PUBLIC EXECUTE` nas funções privadas, grants explícitos para consumidores legítimos e privilégio padrão fechado para funções futuras;
- limitação das mutações anônimas de contato e afiliado por origem pseudonimizada, com HMAC, RLS, falha fechada e mensagens públicas sanitizadas;
- retenção autônoma dos contadores anônimos expirados por lote limitado e job `pg_cron` restrito ao executor `postgres`.

Cada arquivo `FASE-B*.md` descreve uma entrega específica. O estado consolidado está em [`../STATUS.md`](../STATUS.md).

## Validação

O comando local consolidado é `npm run check`. Ele permanece bloqueante para lint, testes, contratos, TypeScript, audit, build e validações de artefatos.

No GitHub Actions, o mesmo snapshot também precisa passar:

- reconstrução local do Supabase e pgTAP;
- smoke HTTP do build servido e fallback SPA;
- Chrome headless controlado pelo DevTools Protocol;
- conteúdo final de `/`, `/login`, `/certificado`, `/contato`, `/matricule-se`, `/esqueceu-senha`, `/acesso-negado` e fallback 404;
- exatamente um landmark `#main-content` com `tabindex="-1"` em cada rota;
- exatamente um link `Pular para o conteúdo principal` e uma live region de navegação;
- navegação client-side home → `/login` com fallback observado e nunca focado;
- foco final em `#main-content`, target conectado e anúncio de conclusão;
- home sintética somente após `Curso de validação do runtime` e `Investimento atual`;
- zero request para `*.supabase.co` e zero resposta HTTP com status igual ou superior a 400;
- exatamente um request `Document` em cada carregamento direto;
- exatamente um `Document` inicial na prova client-side e nenhum novo `Document` para `/login`;
- todos os recursos HTTP ou HTTPS na mesma origem e porta do documento servido;
- exatamente nove arquivos `*.network.json` antes da verificação consolidada;
- limpeza do diretório temporário limitada ao perfil criado pela execução atual;
- nenhuma repetição integral do smoke para tratar corrida de filesystem;
- status operacional sincronizado com a evidência integral verde mais recente;
- ausência de exceções JavaScript não tratadas e do Route Error Boundary.

Os artifacts `browser-smoke-<commit>` e `gate-diagnostics-<commit>` preservam DOM, rede e mensagens dos gates aplicáveis. A captura de logs usa `set -o pipefail`, portanto não altera o resultado do comando original.

Uma fase só é considerada concluída quando todas as validações aplicáveis ao seu escopo passam no mesmo snapshot. A aprovação do artefato público não equivale a homologação financeira, E2E autenticado, pentest ou promoção para produção.

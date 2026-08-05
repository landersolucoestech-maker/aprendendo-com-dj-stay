import { readFileSync, writeFileSync } from "node:fs";

const path = "docs/STATUS.md";
let content = readFileSync(path, "utf8");

const replacements = [
  [
    "| Supply chain | audit de dependências, lockfile validado, SBOM, manifesto de fontes e redação de credenciais locais do Supabase CLI nos logs de CI |",
    "| Supply chain | React Router 8.3.0, React 19.2.8, lockfile estrito, auditorias completa e de produção com zero vulnerabilidades, SBOM, manifesto de fontes e redação de credenciais locais do Supabase CLI nos logs de CI |",
  ],
  [
    "| Supabase remoto `dev` | migrations versionadas sincronizadas, contratos confrontados, `pg_cron` 1.6.4 instalado, dois jobs ativos, execução de expiração observada com sucesso e advisor de segurança sem lints |",
    "| Supabase remoto `dev` | migrations versionadas sincronizadas, contratos confrontados, `pg_cron` 1.6.4 instalado, três jobs ativos, 132 de 132 execuções concluídas com sucesso na janela de 24 horas observada e advisor de segurança sem lints |",
  ],
  [
    "A navegação client-side lazy da home para `/login` também é bloqueante. O Chrome precisa observar o fallback com `data-route-focus-deferred=\"true\"`, comprovar que ele nunca recebeu foco e terminar com `document.activeElement.id === \"main-content\"`, elemento ativo conectado ao DOM e anúncio `Navegação concluída. Conteúdo principal atualizado.`. Se o target final previamente focado for substituído, o foco é restaurado apenas quando a referência anterior estiver desconectada; mutações que preservam o target não causam refoco.",
    "A navegação client-side lazy da home para `/login` também é bloqueante. O fallback com `data-route-focus-deferred=\"true\"` pode ou não ser observado, conforme a disponibilidade do chunk; quando renderizado, ele nunca pode receber foco. Em ambos os caminhos, a transição deve terminar com `document.activeElement.id === \"main-content\"`, elemento ativo conectado ao DOM e anúncio `Navegação concluída. Conteúdo principal atualizado.`. Se o target final previamente focado for substituído, o foco é restaurado apenas quando a referência anterior estiver desconectada; mutações que preservam o target não causam refoco.",
  ],
  [
    "A evidência integral B139 mais recente usa o snapshot funcional `c4e299b8f544dc07bd394f1ae287efb4ee53e2e9`, issue `#1074` e run `30957555483`, aprovado no mesmo snapshot por instalação, lint, 799 testes unitários, reconstrução local do Supabase, 1.878 testes pgTAP, tipos, contratos, TypeScript, build, oito rotas públicas acessíveis, handoff de foco lazy, exatamente nove artefatos de rede, ausência de novo `Document` na navegação home → `/login`, isolamento exato de origem e porta e uma única execução do smoke principal sem contorno no workflow. A sincronização remota posterior está registrada em [`refactor/FASE-B140-SUPABASE-DEV-REMOTE-SYNC.md`](refactor/FASE-B140-SUPABASE-DEV-REMOTE-SYNC.md).",
    "A evidência integral B139 permanece preservada no snapshot funcional `c4e299b8f544dc07bd394f1ae287efb4ee53e2e9`, issue `#1074` e run `30957555483`, aprovado no mesmo snapshot por instalação, lint, 799 testes unitários, reconstrução local do Supabase, 1.878 testes pgTAP, tipos, contratos, TypeScript, build, oito rotas públicas acessíveis, handoff de foco lazy, exatamente nove artefatos de rede, ausência de novo `Document` na navegação home → `/login`, isolamento exato de origem e porta e uma única execução do smoke principal sem contorno no workflow. A sincronização remota posterior está registrada em [`refactor/FASE-B140-SUPABASE-DEV-REMOTE-SYNC.md`](refactor/FASE-B140-SUPABASE-DEV-REMOTE-SYNC.md).\n\nA evidência técnica mais recente usa o snapshot `e721da645855b92c5a1a5b09202f4a96bf89127a`, issue `#1128` e run `30978834435`. O mesmo snapshot aprovou instalação limpa, lint, 804 testes unitários, reconstrução local do Supabase, 1.935 testes pgTAP, sincronização de tipos, todos os contratos estáticos, TypeScript, auditorias completa e de produção com zero vulnerabilidades, build, oito rotas públicas, navegação client-side rápida ou suspensa, navegação móvel, skip link por teclado confiável, exatamente nove artefatos de rede e isolamento de origem, porta e `Document`.",
  ],
  [
    "O módulo PostgreSQL `pg_cron`, os jobs de expiração e retenção e o read model administrativo de saúde foram promovidos ao Supabase remoto `dev`. A versão instalada do `pg_cron` é `1.6.4`; os dois jobs estão ativos e a primeira execução observada de `expire-due-checkout-intents` terminou com status `succeeded`. Nenhum desses componentes foi promovido à produção.",
    "O módulo PostgreSQL `pg_cron`, os jobs de expiração e retenção e o read model administrativo de saúde foram promovidos ao Supabase remoto `dev`. A versão instalada do `pg_cron` é `1.6.4`; os três jobs estão ativos. Na janela de 24 horas observada em 5 de agosto de 2026, `expire-due-checkout-intents` concluiu 123 de 123 execuções, `prune-anonymous-mutation-rate-limits` concluiu 8 de 8 e `prune-platform-cron-run-history` concluiu 1 de 1, totalizando 132 sucessos e zero falhas. O advisor de segurança permaneceu sem lints. Os avisos de performance são apenas informativos sobre índices ainda não usados em um ambiente sem tráfego representativo; nenhum índice foi removido com base nesse sinal. Nenhum desses componentes foi promovido à produção.",
  ],
  [
    "- observação continuada dos jobs e de `cron.job_run_details` por janela representativa;",
    "- observação continuada dos jobs e de `cron.job_run_details` antes da promoção, apesar da janela atual de 24 horas já registrar 132 de 132 execuções bem-sucedidas;",
  ],
];

for (const [before, after] of replacements) {
  const occurrences = content.split(before).length - 1;
  if (occurrences !== 1) {
    throw new Error(`Substituição operacional esperava 1 ocorrência e encontrou ${occurrences}: ${before.slice(0, 100)}`);
  }
  content = content.replace(before, after);
}

const requiredFragments = [
  "c4e299b8f544dc07bd394f1ae287efb4ee53e2e9",
  "#1074",
  "30957555483",
  "799 testes unitários",
  "1.878 testes pgTAP",
  "e721da645855b92c5a1a5b09202f4a96bf89127a",
  "#1128",
  "30978834435",
  "804 testes unitários",
  "1.935 testes pgTAP",
  "132 de 132",
  "zero vulnerabilidades",
  "fallback com `data-route-focus-deferred=\"true\"` pode ou não ser observado",
  "A branch `main` e o projeto Supabase de produção não foram promovidos",
];

for (const fragment of requiredFragments) {
  if (!content.includes(fragment)) {
    throw new Error(`Fragmento obrigatório ausente após sincronização: ${fragment}`);
  }
}

writeFileSync(path, content, "utf8");
console.log("STATUS operacional sincronizado sem remover a evidência histórica B139.");

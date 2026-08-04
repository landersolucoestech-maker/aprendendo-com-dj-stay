import { existsSync, readFileSync } from "node:fs";

const requiredFiles = [
  "README.md",
  "docs/STATUS.md",
  "docs/environment.md",
  "docs/audit/README.md",
  "docs/refactor/README.md",
  "docs/refactor/FASE-B118-HEADLESS-BROWSER-SMOKE.md",
  "docs/refactor/FASE-B121-SUPABASE-CI-LOG-REDACTION.md",
  "docs/refactor/FASE-B122-PUBLIC-ROUTE-MATRIX-SMOKE.md",
  "docs/refactor/FASE-B123-BROWSER-ACCESSIBILITY-READINESS.md",
  "docs/refactor/FASE-B124-PUBLIC-RUNTIME-TRUTH.md",
  "docs/refactor/FASE-B125-LAZY-ROUTE-FOCUS-HANDOFF.md",
  "docs/refactor/FASE-B126-LAZY-FOCUS-TRUTH.md",
  "supabase/config.toml",
];
const failures = [];
const normalize = (value) => value.normalize("NFC").toLocaleLowerCase("pt-BR");
const includesNormalized = (content, fragment) =>
  normalize(content).includes(normalize(fragment));

for (const file of requiredFiles) {
  if (!existsSync(file)) failures.push(`Fonte documental ausente: ${file}`);
}

if (failures.length === 0) {
  const readme = readFileSync("README.md", "utf8");
  const status = readFileSync("docs/STATUS.md", "utf8");
  const environment = readFileSync("docs/environment.md", "utf8");
  const audit = readFileSync("docs/audit/README.md", "utf8");
  const refactor = readFileSync("docs/refactor/README.md", "utf8");
  const browserSmoke = readFileSync(
    "docs/refactor/FASE-B118-HEADLESS-BROWSER-SMOKE.md",
    "utf8",
  );
  const logRedaction = readFileSync(
    "docs/refactor/FASE-B121-SUPABASE-CI-LOG-REDACTION.md",
    "utf8",
  );
  const routeMatrix = readFileSync(
    "docs/refactor/FASE-B122-PUBLIC-ROUTE-MATRIX-SMOKE.md",
    "utf8",
  );
  const accessibilityReadiness = readFileSync(
    "docs/refactor/FASE-B123-BROWSER-ACCESSIBILITY-READINESS.md",
    "utf8",
  );
  const runtimeTruth = readFileSync(
    "docs/refactor/FASE-B124-PUBLIC-RUNTIME-TRUTH.md",
    "utf8",
  );
  const focusHandoff = readFileSync(
    "docs/refactor/FASE-B125-LAZY-ROUTE-FOCUS-HANDOFF.md",
    "utf8",
  );
  const focusTruth = readFileSync(
    "docs/refactor/FASE-B126-LAZY-FOCUS-TRUTH.md",
    "utf8",
  );
  const supabaseConfig = readFileSync("supabase/config.toml", "utf8");

  const staleClaims = [
    "Autenticação, autorização, banco canônico, storage privado, pagamentos, Pix, marketplace e afiliados ainda não devem ser considerados operacionais",
    "O código herdado é um protótipo React/Vite com integrações incompletas",
  ];
  for (const claim of staleClaims) {
    if (includesNormalized(readme, claim)) {
      failures.push(`README preserva diagnóstico obsoleto: ${claim}`);
    }
  }

  for (const fragment of [
    "exclusivamente na branch `dev`",
    "não foram promovidos",
    "Autenticação, papéis, banco canônico, storage privado",
    "homologação financeira no sandbox",
    "Não existe modelo multi-instrutor",
    "docs/STATUS.md",
    "docs/audit/README.md",
    "docs/refactor/README.md",
  ]) {
    if (!includesNormalized(readme, fragment)) {
      failures.push(`README não preserva a verdade operacional B33: ${fragment}`);
    }
  }

  for (const fragment of [
    "## Validado em `dev`",
    "## Integrações implantadas em `dev`",
    "## Dependências de homologação externa",
    "## Produção",
    "create-asaas-checkout",
    "asaas-webhook",
    "media-playback",
    "Shell público e proveniência",
    "Entrega HTTP",
    "Runtime público",
    "oito rotas anônimas",
    "`/contato`",
    "`/matricule-se`",
    "`/esqueceu-senha`",
    "`/acesso-negado`",
    "exatamente um `#main-content`",
    "`tabindex=\"-1\"`",
    "`Pular para o conteúdo principal`",
    "live region de navegação",
    "reconciliação acessível após substituições do `Suspense`",
    "foco diferido em fallbacks e handoff para o conteúdo final",
    "`data-route-focus-deferred=\"true\"`",
    "`document.activeElement.id === \"main-content\"`",
    "target final previamente focado for substituído",
    "redação de credenciais locais do Supabase CLI",
    "smoke HTTP",
    "smoke bloqueante em Chrome headless com matriz pública e prontidão acessível",
    "chave sintética canônica",
    "explicitamente **não implantável**",
    "63ebdfd043fc4a3ba02642c7b0f470e97be0611d",
    "03106954c5ed0d9238a55625f4c30cf7e83a4699",
    "795 testes unitários",
    "1.878 testes pgTAP",
    "A presença da função e a aprovação do gate não equivalem a uma transação financeira homologada",
    "A branch `main` e o projeto Supabase de produção não foram promovidos",
  ]) {
    if (!includesNormalized(status, fragment)) {
      failures.push(`STATUS.md incompleto: ${fragment}`);
    }
  }

  for (const edgeFunction of [
    "functions.media-playback",
    "functions.asaas-webhook",
    "functions.create-asaas-checkout",
  ]) {
    if (!supabaseConfig.includes(edgeFunction)) {
      failures.push(`Supabase config não comprova a integração documentada: ${edgeFunction}`);
    }
  }

  for (const projectRef of ["jmtyurketfclaneqxohu", "tduvfrxagujryfnqpdmc"]) {
    if (!readme.includes(projectRef) || !environment.includes(projectRef)) {
      failures.push(`Mapeamento de ambiente divergente para ${projectRef}.`);
    }
  }

  if (!includesNormalized(audit, "npm run check") || !includesNormalized(audit, "não substitui")) {
    failures.push("Índice de auditoria deve explicar execução e limites.");
  }
  for (const fragment of [
    "uma causa observada por vez",
    "não equivale a homologação externa",
    "smoke HTTP do build servido",
    "Chrome headless controlado pelo DevTools Protocol",
    "matriz de oito rotas públicas",
    "conteúdo final de `/`, `/login`, `/certificado`, `/contato`, `/matricule-se`, `/esqueceu-senha`, `/acesso-negado` e fallback 404",
    "landmark `#main-content` com `tabindex=\"-1\"`",
    "link `Pular para o conteúdo principal` e uma live region",
    "navegação client-side home → `/login` com fallback observado e nunca focado",
    "foco final em `#main-content`, target conectado e anúncio de conclusão",
  ]) {
    if (!includesNormalized(refactor, fragment)) {
      failures.push(`Índice de refatoração incompleto: ${fragment}`);
    }
  }

  for (const fragment of [
    "FASE B118",
    "fallbacks transitórios",
    "todos os fragmentos finais contratados para a rota",
    "rejeita fallbacks transitórios",
    "sem Playwright, Puppeteer, Selenium",
    "A aprovação em `dev` não equivale a homologação externa",
  ]) {
    if (!includesNormalized(browserSmoke, fragment)) {
      failures.push(`Documentação B118 incompleta: ${fragment}`);
    }
  }

  for (const fragment of [
    "FASE B121",
    "set -o pipefail",
    "Mensagens de progresso",
    "Nenhuma credencial real foi versionada",
  ]) {
    if (!includesNormalized(logRedaction, fragment)) {
      failures.push(`Documentação B121 incompleta: ${fragment}`);
    }
  }

  for (const fragment of [
    "FASE B122",
    "oito rotas",
    "`/contato`",
    "`/matricule-se`",
    "`/esqueceu-senha`",
    "`/acesso-negado`",
    "`/rota-inexistente-b122`",
    "não submete formulários",
  ]) {
    if (!includesNormalized(routeMatrix, fragment)) {
      failures.push(`Documentação B122 incompleta: ${fragment}`);
    }
  }

  for (const fragment of [
    "FASE B123",
    "MutationObserver",
    "não observa atributos",
    "observer é desconectado",
    "exatamente um `#main-content`",
    "zero eventos `Runtime.exceptionThrown`",
    "63ebdfd043fc4a3ba02642c7b0f470e97be0611d",
  ]) {
    if (!includesNormalized(accessibilityReadiness, fragment)) {
      failures.push(`Documentação B123 incompleta: ${fragment}`);
    }
  }

  for (const fragment of [
    "FASE B124",
    "Verdade consolidada do runtime público",
    "oito rotas públicas",
    "exatamente um `#main-content`",
    "zero exceções `Runtime.exceptionThrown`",
    "artefato de qualidade e implantação real",
    "63ebdfd043fc4a3ba02642c7b0f470e97be0611d",
    "A verdade consolidada do runtime público não equivale",
  ]) {
    if (!includesNormalized(runtimeTruth, fragment)) {
      failures.push(`Documentação B124 incompleta: ${fragment}`);
    }
  }

  for (const fragment of [
    "FASE B125",
    'data-route-focus-deferred="true"',
    "não move o foco, não anuncia conclusão e não atualiza `previousPathRef`",
    "target for posteriormente desconectado",
    "mutações normais que preservam o mesmo nó não disparam refoco",
    "document.activeElement.id === \"main-content\"",
    "fallback nunca focado",
    "Supabase remoto não foi modificado",
  ]) {
    if (!includesNormalized(focusHandoff, fragment)) {
      failures.push(`Documentação B125 incompleta: ${fragment}`);
    }
  }

  for (const fragment of [
    "FASE B126",
    "Verdade consolidada da transferência de foco lazy",
    "795 testes unitários",
    "1.878 testes pgTAP",
    "fallback nunca recebeu foco",
    "`document.activeElement.id` terminou como `main-content`",
    "elemento ativo permaneceu conectado ao DOM",
    "03106954c5ed0d9238a55625f4c30cf7e83a4699",
    "A prova representa uma transição lazy pública",
  ]) {
    if (!includesNormalized(focusTruth, fragment)) {
      failures.push(`Documentação B126 incompleta: ${fragment}`);
    }
  }

  const prohibitedProductionClaims = [
    "produção está liberada",
    "produção está pronta",
    "pagamentos estão homologados",
    "checkout está homologado",
    "pentest concluído",
  ];
  const combinedDocumentation = [
    readme,
    status,
    audit,
    refactor,
    browserSmoke,
    logRedaction,
    routeMatrix,
    accessibilityReadiness,
    runtimeTruth,
    focusHandoff,
    focusTruth,
  ].join("\n");
  for (const claim of prohibitedProductionClaims) {
    if (includesNormalized(combinedDocumentation, claim)) {
      failures.push(`Documentação contém alegação de produção sem evidência: ${claim}`);
    }
  }
}

if (failures.length > 0) {
  console.error(
    "Contrato B33/B120/B124/B126 inválido:\n- " + failures.join("\n- "),
  );
  process.exit(1);
}

console.log(
  "Contrato B33/B120/B124/B126 aprovado: implementação, runtime acessível, handoff de foco, dependências externas e produção estão documentalmente separados.",
);

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
  "docs/refactor/FASE-B127-CI-RUNTIME-CATALOG-ISOLATION.md",
  "docs/refactor/FASE-B128-PUBLIC-RUNTIME-NETWORK-ISOLATION.md",
  "docs/refactor/FASE-B129-GATE-DIAGNOSTICS.md",
  "docs/refactor/FASE-B130-DETERMINISTIC-PUBLIC-RUNTIME-TRUTH.md",
  "docs/refactor/FASE-B132-CLIENT-NAVIGATION-NETWORK-ISOLATION.md",
  "docs/refactor/FASE-B133-RUNTIME-PROFILE-CLEANUP.md",
  "docs/refactor/FASE-B134-CURRENT-GATE-DOCUMENTATION-TRUTH.md",
  "supabase/config.toml",
];

const failures = [];
const normalize = (value) => value.normalize("NFC").toLocaleLowerCase("pt-BR");
const includesNormalized = (content, fragment) =>
  normalize(content).includes(normalize(fragment));
const read = (file) => readFileSync(file, "utf8");

const assertFragments = (label, content, fragments) => {
  for (const fragment of fragments) {
    if (!includesNormalized(content, fragment)) {
      failures.push(`${label} incompleto: ${fragment}`);
    }
  }
};

for (const file of requiredFiles) {
  if (!existsSync(file)) failures.push(`Fonte documental ausente: ${file}`);
}

if (failures.length === 0) {
  const documents = {
    readme: read("README.md"),
    status: read("docs/STATUS.md"),
    environment: read("docs/environment.md"),
    audit: read("docs/audit/README.md"),
    refactor: read("docs/refactor/README.md"),
    browserSmoke: read("docs/refactor/FASE-B118-HEADLESS-BROWSER-SMOKE.md"),
    logRedaction: read(
      "docs/refactor/FASE-B121-SUPABASE-CI-LOG-REDACTION.md",
    ),
    routeMatrix: read(
      "docs/refactor/FASE-B122-PUBLIC-ROUTE-MATRIX-SMOKE.md",
    ),
    accessibilityReadiness: read(
      "docs/refactor/FASE-B123-BROWSER-ACCESSIBILITY-READINESS.md",
    ),
    runtimeTruth: read("docs/refactor/FASE-B124-PUBLIC-RUNTIME-TRUTH.md"),
    focusHandoff: read(
      "docs/refactor/FASE-B125-LAZY-ROUTE-FOCUS-HANDOFF.md",
    ),
    focusTruth: read("docs/refactor/FASE-B126-LAZY-FOCUS-TRUTH.md"),
    catalogIsolation: read(
      "docs/refactor/FASE-B127-CI-RUNTIME-CATALOG-ISOLATION.md",
    ),
    networkIsolation: read(
      "docs/refactor/FASE-B128-PUBLIC-RUNTIME-NETWORK-ISOLATION.md",
    ),
    gateDiagnostics: read("docs/refactor/FASE-B129-GATE-DIAGNOSTICS.md"),
    deterministicTruth: read(
      "docs/refactor/FASE-B130-DETERMINISTIC-PUBLIC-RUNTIME-TRUTH.md",
    ),
    navigationNetwork: read(
      "docs/refactor/FASE-B132-CLIENT-NAVIGATION-NETWORK-ISOLATION.md",
    ),
    profileCleanup: read(
      "docs/refactor/FASE-B133-RUNTIME-PROFILE-CLEANUP.md",
    ),
    currentGateTruth: read(
      "docs/refactor/FASE-B134-CURRENT-GATE-DOCUMENTATION-TRUTH.md",
    ),
    supabaseConfig: read("supabase/config.toml"),
  };

  for (const claim of [
    "Autenticação, autorização, banco canônico, storage privado, pagamentos, Pix, marketplace e afiliados ainda não devem ser considerados operacionais",
    "O código herdado é um protótipo React/Vite com integrações incompletas",
  ]) {
    if (includesNormalized(documents.readme, claim)) {
      failures.push(`README preserva diagnóstico obsoleto: ${claim}`);
    }
  }

  assertFragments("README", documents.readme, [
    "exclusivamente na branch `dev`",
    "não foram promovidos",
    "Autenticação, papéis, banco canônico, storage privado",
    "homologação financeira no sandbox",
    "Não existe modelo multi-instrutor",
    "docs/STATUS.md",
    "docs/audit/README.md",
    "docs/refactor/README.md",
  ]);

  assertFragments("STATUS.md", documents.status, [
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
    "Runtime sintético do catálogo",
    "Isolamento de rede público",
    "Rede da navegação client-side",
    "Limpeza do perfil do Chrome",
    "Diagnósticos do gate",
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
    "fixture canônica em memória",
    "mesmo schema Zod da RPC real",
    "zero chamadas à RPC",
    "`Curso de validação do runtime`",
    "`Investimento atual`",
    "`<rota>.network.json`",
    "`client-navigation.network.json`",
    "exatamente nove artefatos de rede",
    "um único `Document` inicial",
    "não cria novo `Document`",
    "status igual ou superior a 400",
    "`*.supabase.co`",
    "exatamente um request principal `Document` por rota",
    "mesma origem e porta efêmera do documento servido",
    "stack tipográfica nativa",
    "no máximo seis vezes",
    "`ENOTEMPTY`, `EBUSY` ou `EPERM`",
    "nenhuma reexecução integral do navegador",
    "não remove `/tmp/djstay-browser-profile-*` por glob",
    "uma única execução do smoke principal sem contorno no workflow",
    "`gate-diagnostics-<commit>`",
    "`set -o pipefail`",
    "redação de credenciais locais do Supabase CLI",
    "smoke HTTP",
    "smoke bloqueante em Chrome headless com matriz pública e prontidão acessível",
    "chave sintética canônica",
    "explicitamente **não implantável**",
    "63ebdfd043fc4a3ba02642c7b0f470e97be0611d",
    "03106954c5ed0d9238a55625f4c30cf7e83a4699",
    "92270adc7d949f0719e1fdb3673f2d47bedb6aaf",
    "7f0b21f4f39dd80508f589619e89b987d903a5bc",
    "#1055",
    "30952181505",
    "795 testes unitários",
    "799 testes unitários",
    "1.878 testes pgTAP",
    "A presença da função e a aprovação do gate não equivalem a uma transação financeira homologada",
    "A branch `main` e o projeto Supabase de produção não foram promovidos",
  ]);

  for (const edgeFunction of [
    "functions.media-playback",
    "functions.asaas-webhook",
    "functions.create-asaas-checkout",
  ]) {
    if (!documents.supabaseConfig.includes(edgeFunction)) {
      failures.push(
        `Supabase config não comprova a integração documentada: ${edgeFunction}`,
      );
    }
  }

  for (const projectRef of ["jmtyurketfclaneqxohu", "tduvfrxagujryfnqpdmc"]) {
    if (
      !documents.readme.includes(projectRef) ||
      !documents.environment.includes(projectRef)
    ) {
      failures.push(`Mapeamento de ambiente divergente para ${projectRef}.`);
    }
  }

  assertFragments("Índice de auditoria", documents.audit, [
    "npm run check",
    "não substitui",
  ]);

  assertFragments("Índice de refatoração", documents.refactor, [
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
    "catálogo sintético canônico validado pelo mesmo schema Zod da RPC real",
    "zero chamada à RPC e zero rede Supabase remota no build sintético",
    "bloqueio de respostas HTTP com status igual ou superior a 400",
    "stack tipográfica nativa",
    "origem e porta exatas do documento servido",
    "exatamente nove artefatos de rede",
    "proibição de um segundo `Document` durante a troca client-side",
    "limpeza limitada do perfil temporário dentro de cada smoke do Chrome",
    "proibição de reexecutar o smoke inteiro para contornar `ENOTEMPTY`",
    "nenhuma repetição integral do smoke para tratar corrida de filesystem",
    "diagnósticos persistentes de TypeScript e navegador com `set -o pipefail`",
    "`browser-smoke-<commit>`",
    "`gate-diagnostics-<commit>`",
  ]);

  const phaseContracts = [
    [
      "Documentação B118",
      documents.browserSmoke,
      [
        "FASE B118",
        "fallbacks transitórios",
        "todos os fragmentos finais contratados para a rota",
        "rejeita fallbacks transitórios",
        "sem Playwright, Puppeteer, Selenium",
        "A aprovação em `dev` não equivale a homologação externa",
      ],
    ],
    [
      "Documentação B121",
      documents.logRedaction,
      [
        "FASE B121",
        "set -o pipefail",
        "Mensagens de progresso",
        "Nenhuma credencial real foi versionada",
      ],
    ],
    [
      "Documentação B122",
      documents.routeMatrix,
      [
        "FASE B122",
        "oito rotas",
        "`/contato`",
        "`/matricule-se`",
        "`/esqueceu-senha`",
        "`/acesso-negado`",
        "`/rota-inexistente-b122`",
        "não submete formulários",
      ],
    ],
    [
      "Documentação B123",
      documents.accessibilityReadiness,
      [
        "FASE B123",
        "MutationObserver",
        "não observa atributos",
        "observer é desconectado",
        "exatamente um `#main-content`",
        "zero eventos `Runtime.exceptionThrown`",
        "63ebdfd043fc4a3ba02642c7b0f470e97be0611d",
      ],
    ],
    [
      "Documentação B124",
      documents.runtimeTruth,
      [
        "FASE B124",
        "Verdade consolidada do runtime público",
        "oito rotas públicas",
        "exatamente um `#main-content`",
        "zero exceções `Runtime.exceptionThrown`",
        "artefato de qualidade e implantação real",
        "63ebdfd043fc4a3ba02642c7b0f470e97be0611d",
        "A verdade consolidada do runtime público não equivale",
      ],
    ],
    [
      "Documentação B125",
      documents.focusHandoff,
      [
        "FASE B125",
        'data-route-focus-deferred="true"',
        "não move o foco, não anuncia conclusão e não atualiza `previousPathRef`",
        "target for posteriormente desconectado",
        "atualizações normais que preservam o mesmo nó não disparam refoco",
        'document.activeElement.id === "main-content"',
        "fallback nunca focado",
        "Supabase remoto não foi modificado",
      ],
    ],
    [
      "Documentação B126",
      documents.focusTruth,
      [
        "FASE B126",
        "Verdade consolidada da transferência de foco lazy",
        "795 testes unitários",
        "1.878 testes pgTAP",
        "fallback nunca recebeu foco",
        "`document.activeElement.id` terminou como `main-content`",
        "elemento ativo permaneceu conectado ao DOM",
        "03106954c5ed0d9238a55625f4c30cf7e83a4699",
        "A prova representa uma transição lazy pública",
      ],
    ],
    [
      "Documentação B127",
      documents.catalogIsolation,
      [
        "FASE B127",
        "resposta HTTP `401`",
        "fixture canônica",
        "mesmo `publicCourseCatalogSchema`",
        "RPC receba zero chamadas no modo sintético",
        "`Curso de validação do runtime`",
        "`<rota>.network.json`",
        "qualquer requisição aponta para `*.supabase.co`",
        "Supabase remoto não foi modificado",
      ],
    ],
    [
      "Documentação B128",
      documents.networkIsolation,
      [
        "FASE B128",
        "duas requisições externas em cada uma das oito rotas",
        "`fonts.googleapis.com`",
        "`fonts.gstatic.com`",
        "stack nativa",
        "exatamente uma requisição principal do tipo `Document`",
        "origem completa, incluindo a porta efêmera",
        "mesma origem do documento principal",
        "`external-network-summary.json`",
        "Nenhum arquivo de fonte foi versionado",
      ],
    ],
    [
      "Documentação B129",
      documents.gateDiagnostics,
      [
        "FASE B129",
        "Diagnósticos persistentes do gate",
        "`artifacts/diagnostics/typecheck.log`",
        "`artifacts/diagnostics/browser-runtime.log`",
        "`set -o pipefail`",
        "`gate-diagnostics-<commit>`",
        "`TS18048`",
        "não transforma falha em sucesso",
      ],
    ],
    [
      "Documentação B130",
      documents.deterministicTruth,
      [
        "FASE B130",
        "Verdade consolidada do runtime público determinístico",
        "92270adc7d949f0719e1fdb3673f2d47bedb6aaf",
        "799 testes unitários",
        "1.878 testes pgTAP",
        "zero chamadas à RPC",
        "zero requests fora dessa origem",
        "stack tipográfica nativa",
        "`gate-diagnostics-<commit>`",
        "não equivale",
      ],
    ],
    [
      "Documentação B132",
      documents.navigationNetwork,
      [
        "FASE B132",
        "não persistia os eventos `Network.requestWillBeSent` e `Network.responseReceived`",
        "`client-navigation.network.json`",
        "exatamente nove artefatos de rede",
        "nenhuma requisição `Document` durante a fase `client-navigation`",
        "mesma origem e porta do documento inicial",
        "nenhuma resposta HTTP com status maior ou igual a 400",
        "Supabase remoto não foi modificado",
        "Nenhuma dependência ou lockfile foi alterado",
        "Nenhuma exceção de rede foi adicionada",
      ],
    ],
    [
      "Documentação B133",
      documents.profileCleanup,
      [
        "FASE B133",
        "produzindo `ENOTEMPTY`",
        "repetia navegação, coleta de artefatos e validações já concluídas",
        "repete a remoção no máximo seis vezes",
        "somente para `ENOTEMPTY`, `EBUSY` e `EPERM`",
        "não possui mais a função `run_runtime_smoke`",
        "não repete rotas",
        "nunca dispara repetição",
        "nenhum diretório temporário de outra execução é removido por glob",
        "Supabase remoto não foi modificado",
        "nenhuma migration, dependência ou lockfile foi alterado",
      ],
    ],
    [
      "Documentação B134",
      documents.currentGateTruth,
      [
        "FASE B134",
        "documentação operacional atrás do código validado",
        "exatamente nove artefatos `*.network.json`",
        "um único `Document` inicial e nenhum novo `Document`",
        "ausência de repetição integral do smoke",
        "7f0b21f4f39dd80508f589619e89b987d903a5bc",
        "`#1055`",
        "`30952181505`",
        "799 testes unitários e 1.878 testes pgTAP",
        "não pode declarar o workaround de repetição como comportamento atual",
        "a branch `main` e o Supabase de produção permanecem sem promoção",
      ],
    ],
  ];

  for (const [label, content, fragments] of phaseContracts) {
    assertFragments(label, content, fragments);
  }

  const prohibitedProductionClaims = [
    "produção está liberada",
    "produção está pronta",
    "pagamentos estão homologados",
    "checkout está homologado",
    "pentest concluído",
  ];
  const combinedDocumentation = Object.values(documents).join("\n");
  for (const claim of prohibitedProductionClaims) {
    if (includesNormalized(combinedDocumentation, claim)) {
      failures.push(`Documentação contém alegação de produção sem evidência: ${claim}`);
    }
  }
}

if (failures.length > 0) {
  console.error(
    "Contrato B33/B120/B124/B126/B130/B134 inválido:\n- " +
      [...new Set(failures)].join("\n- "),
  );
  process.exit(1);
}

console.log(
  "Contrato B33/B120/B124/B126/B130/B134 aprovado: implementação, evidência atual, runtime determinístico, rede client-side, limpeza do Chrome, dependências externas e produção estão documentalmente separados.",
);
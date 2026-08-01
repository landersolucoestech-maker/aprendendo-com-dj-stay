import { existsSync, readFileSync } from "node:fs";

const requiredFiles = [
  "README.md",
  "docs/STATUS.md",
  "docs/environment.md",
  "docs/audit/README.md",
  "docs/refactor/README.md",
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
  if (
    !includesNormalized(refactor, "uma causa observada por vez") ||
    !includesNormalized(refactor, "não equivale a homologação externa")
  ) {
    failures.push("Índice de refatoração deve preservar execução sequencial e limites.");
  }

  const prohibitedProductionClaims = [
    "produção está liberada",
    "produção está pronta",
    "pagamentos estão homologados",
    "checkout está homologado",
    "pentest concluído",
  ];
  const combinedDocumentation = [readme, status, audit, refactor].join("\n");
  for (const claim of prohibitedProductionClaims) {
    if (includesNormalized(combinedDocumentation, claim)) {
      failures.push(`Documentação contém alegação de produção sem evidência: ${claim}`);
    }
  }
}

if (failures.length > 0) {
  console.error("Contrato B33 inválido:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(
  "Contrato B33 aprovado: implementação em dev, dependências externas e produção estão documentalmente separadas.",
);

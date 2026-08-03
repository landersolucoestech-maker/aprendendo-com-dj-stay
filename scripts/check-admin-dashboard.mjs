import { existsSync, readFileSync } from "node:fs";

const requiredFiles = [
  "src/pages/admin/AdminDashboard.tsx",
  "src/lib/admin-overview.ts",
  "src/lib/admin-overview.test.ts",
  "src/routing/lazy/admin-pages.ts",
  "src/components/admin/AdminNavigation.tsx",
  "src/routing/RoleLandingRedirect.tsx",
  "src/App.tsx",
  "scripts/check-admin-navigation.mjs",
  "scripts/check-course-cms-contract.mjs",
  "docs/refactor/FASE-B87-ADMIN-OVERVIEW-DASHBOARD.md",
  "docs/STATUS.md",
  "package.json",
];

const failures = [];
for (const file of requiredFiles) {
  if (!existsSync(file)) failures.push(`Arquivo B87 ausente: ${file}`);
}

if (failures.length === 0) {
  const page = readFileSync(requiredFiles[0], "utf8");
  const overview = readFileSync(requiredFiles[1], "utf8");
  const test = readFileSync(requiredFiles[2], "utf8");
  const lazyPages = readFileSync(requiredFiles[3], "utf8");
  const navigation = readFileSync(requiredFiles[4], "utf8");
  const redirect = readFileSync(requiredFiles[5], "utf8");
  const app = readFileSync(requiredFiles[6], "utf8");
  const adminNavigationCheck = readFileSync(requiredFiles[7], "utf8");
  const courseCmsCheck = readFileSync(requiredFiles[8], "utf8");
  const documentation = readFileSync(requiredFiles[9], "utf8");
  const status = readFileSync(requiredFiles[10], "utf8");
  const packageJson = readFileSync(requiredFiles[11], "utf8");

  for (const hook of [
    "usePaymentAdminDashboard",
    "useStudentsAdminDashboard",
    "useAdminCourses",
    "useMarketplaceAdminProducts",
    "useSupportAdminDashboard",
    "useContactMessagesAdmin",
  ]) {
    if (!page.includes(hook)) failures.push(`Dashboard B87 não usa o read model real: ${hook}`);
  }

  for (const fragment of [
    "buildAdminOverview",
    "Valor confirmado",
    "Certificados válidos",
    "Fila operacional",
    "valor desta página é estimado ou preenchido com dados de exemplo",
    "studentLimit: 1",
    "enrollmentLimit: 1",
    "certificateLimit: 1",
    'to="/admin/pagamentos"',
    'to="/admin/alunos"',
    'to="/admin/suporte"',
    'to="/admin/contatos"',
  ]) {
    if (!page.includes(fragment)) failures.push(`Dashboard B87 incompleto: ${fragment}`);
  }

  for (const forbidden of [
    "const mock",
    "mockData",
    "Math.random",
    "sampleData",
    "activeEnrollments",
    "suspendedEnrollments",
    "averageCompletionPercent",
  ]) {
    if (page.includes(forbidden)) failures.push(`Dashboard B87 contém dado não operacional: ${forbidden}`);
  }

  for (const fragment of [
    "input.students.totals.students",
    "input.students.totals.enrollments",
    "input.students.totals.certificates",
    "input.students.totals.valid_certificates",
    "confirmedAmountCents",
    "publishedCourses",
    "publishedProducts",
    "operationalQueue",
    "pendingOrders + awaitingSupport + newContacts",
  ]) {
    if (!overview.includes(fragment)) failures.push(`Agregação B87 incompleta: ${fragment}`);
  }

  for (const fragment of [
    'describe("buildAdminOverview"',
    "returns a zeroed overview",
    "uses persisted academic totals instead of page lengths",
    "operationalQueue).toBe(12)",
  ]) {
    if (!test.includes(fragment)) failures.push(`Cobertura unitária B87 ausente: ${fragment}`);
  }

  if (!lazyPages.includes("AdminDashboard")) failures.push("Lazy route B87 ausente.");
  if (!navigation.includes('{ to: "/admin", label: "Visão geral"')) failures.push("Navegação B87 ausente.");
  if (!navigation.includes('end={to === "/admin"}')) failures.push("Rota raiz administrativa não usa correspondência exata.");
  if (!redirect.includes('<Navigate to="/admin" replace />')) failures.push("Proprietário não é direcionado ao dashboard B87.");
  if (!app.includes('path="/admin"')) failures.push("Rota protegida /admin ausente.");
  if (!app.includes("<AdminRoute><AdminDashboard /></AdminRoute>")) failures.push("Dashboard B87 não está sob o guard administrativo.");
  if (!adminNavigationCheck.includes('"/admin",')) failures.push("Contrato B45 não cobre a rota B87.");
  if (!courseCmsCheck.includes('navigation.includes(\'{ to: "/admin/cursos", label: "Cursos"\')')) {
    failures.push("Contrato B11 não preserva o acesso ao CMS após a B87.");
  }
  if (courseCmsCheck.includes('<Navigate to="/admin/cursos"')) {
    failures.push("Contrato B11 ainda exige entrada direta no CMS.");
  }

  for (const fragment of [
    "seis read models reais",
    "nenhuma migration",
    "não foram adicionadas estimativas",
    "dados de exemplo",
    "branch `dev`",
  ]) {
    if (!documentation.includes(fragment)) failures.push(`Documentação B87 incompleta: ${fragment}`);
  }

  if (!status.includes("dashboard administrativo do proprietário")) failures.push("STATUS não registra a B87.");
  if (!packageJson.includes('"check:admin-dashboard"')) failures.push("Script B87 ausente no package.json.");
  if (!packageJson.includes("npm run check:admin-dashboard")) failures.push("B87 não está integrada ao typecheck.");
}

if (failures.length > 0) {
  console.error("Contrato B87 inválido:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(
  "Contrato B87 aprovado: o proprietário possui dashboard real, protegido e sem métricas fictícias.",
);

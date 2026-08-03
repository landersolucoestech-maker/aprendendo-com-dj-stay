import { existsSync, readFileSync } from "node:fs";

const paths = {
  migration: "supabase/migrations/20260803033000_academic_admin_analytics.sql",
  databaseTest: "supabase/tests/65_academic_admin_analytics.test.sql",
  contract: "src/contracts/academic-analytics.ts",
  contractTest: "src/contracts/academic-analytics.test.ts",
  generatedTypes: "src/integrations/supabase/types.ts",
  rpc: "src/integrations/supabase/academic-analytics-rpc.ts",
  hook: "src/hooks/useAcademicAnalytics.ts",
  component: "src/components/admin/AcademicAnalyticsCard.tsx",
  page: "src/pages/admin/AcademicAnalyticsAdmin.tsx",
  lazyPages: "src/routing/lazy/admin-pages.ts",
  navigation: "src/components/admin/AdminNavigation.tsx",
  app: "src/App.tsx",
  parent: "scripts/check-students-certificates-contract.mjs",
  documentation: "docs/refactor/FASE-B97-ACADEMIC-ADMIN-ANALYTICS.md",
};

const failures = [];
const read = (path) => readFileSync(path, "utf8");
const requireFragments = (source, label, fragments) => {
  for (const fragment of fragments) {
    if (!source.includes(fragment)) {
      failures.push(`${label}: conteúdo obrigatório ausente: ${fragment}`);
    }
  }
};

for (const path of Object.values(paths)) {
  if (!existsSync(path)) failures.push(`Arquivo B97 ausente: ${path}`);
}

if (failures.length === 0) {
  const migration = read(paths.migration);
  const databaseTest = read(paths.databaseTest);
  const contract = read(paths.contract);
  const contractTest = read(paths.contractTest);
  const generatedTypes = read(paths.generatedTypes);
  const rpc = read(paths.rpc);
  const hook = read(paths.hook);
  const component = read(paths.component);
  const page = read(paths.page);
  const lazyPages = read(paths.lazyPages);
  const navigation = read(paths.navigation);
  const app = read(paths.app);
  const parent = read(paths.parent);
  const documentation = read(paths.documentation).toLowerCase();

  requireFragments(migration, "Migration B97", [
    "private.get_academic_admin_analytics",
    "public.get_academic_admin_analytics",
    "security definer",
    "security invoker",
    "ADMIN_REQUIRED",
    "ACADEMIC_ANALYTICS_PERIOD_INVALID",
    "ACADEMIC_ANALYTICS_PERIOD_TOO_LARGE",
    "ACADEMIC_ANALYTICS_INACTIVITY_INVALID",
    "interval '366 days'",
    "not between 7 and 180",
    "enrollment.starts_at >= v_start_at",
    "module_record.status = 'published'",
    "lesson.status = 'published'",
    "progress.ultima_visualizacao",
    "completed_all_published_lessons",
    "active_without_recent_activity",
    "America/Sao_Paulo",
    "progress_distribution",
    "course_breakdown",
  ]);
  for (const forbidden of [
    "customer_email",
    "student_email",
    "raw_user_meta_data",
    "abandoned_enrollments",
    "abandonment",
  ]) {
    if (migration.toLowerCase().includes(forbidden)) {
      failures.push(`Analytics B97 expõe ou inventa campo proibido: ${forbidden}`);
    }
  }

  requireFragments(databaseTest, "pgTAP B97", [
    "select plan(38)",
    "student cannot inspect academic analytics",
    "analytics counts active enrollments without recent activity",
    "analytics calculates average completion percent",
    "progress distribution counts fully completed enrollments",
    "course filter limits the cohort",
    "analytics rejects inactivity above 180 days",
  ]);
  requireFragments(contract, "Contrato B97", [
    "academicAdminAnalyticsSchema",
    "academicProgressBucketSchema",
    "A distribuição de status diverge da coorte de matrículas.",
    "Inatividade não pode superar matrículas ativas.",
    "A distribuição de progresso diverge da coorte.",
    ".length(6)",
    ".max(367)",
  ]);
  requireFragments(contractTest, "Teste unitário B97", [
    'describe("academicAdminAnalyticsSchema"',
    "accepts a coherent persisted academic snapshot",
    "rejects inactivity greater than active enrollments",
    "rejects personal or unsupported abandonment fields",
  ]);
  requireFragments(generatedTypes, "Tipos gerados B97", [
    "get_academic_admin_analytics:",
    "p_start_at?: string",
    "p_end_at?: string",
    "p_course_id?: string",
    "p_inactive_days?: number",
  ]);
  requireFragments(rpc, "Cliente RPC B97", [
    'functionName: "get_academic_admin_analytics"',
    "p_course_id?: string | null",
    "p_inactive_days?: number",
  ]);
  requireFragments(hook, "Hook B97", [
    "useAcademicAdminAnalytics",
    '"get_academic_admin_analytics"',
    '"analytics acadêmico administrativo"',
  ]);
  requireFragments(component, "Componente B97", [
    "RANGE_OPTIONS = [7, 30, 90, 365]",
    "INACTIVITY_OPTIONS = [7, 14, 30, 60]",
    "Desempenho acadêmico",
    "Sem atividade recente",
    "não significa abandono",
    "Distribuição de progresso",
    "Resultado por curso",
  ]);
  if (component.includes("Abandono") || component.includes("Abandonado")) {
    failures.push("Componente B97 não pode apresentar inatividade como abandono comprovado.");
  }
  requireFragments(page, "Página B97", [
    "Analytics acadêmico",
    "AcademicAnalyticsCard",
    'to="/admin/alunos"',
    'to="/admin/cursos"',
  ]);
  requireFragments(lazyPages, "Lazy B97", ["AcademicAnalyticsAdmin"]);
  requireFragments(navigation, "Navegação B97", [
    '{ to: "/admin/academico", label: "Acadêmico", icon: BarChart3 }',
  ]);
  requireFragments(app, "Rota B97", [
    "AcademicAnalyticsAdmin",
    'path="/admin/academico"',
    "<AdminRoute><AcademicAnalyticsAdmin /></AdminRoute>",
  ]);
  if (!parent.includes('await import("./check-academic-admin-analytics.mjs")')) {
    failures.push("B97 não está encadeada no gate bloqueante B21.");
  }
  requireFragments(documentation, "Documentação B97", [
    "coorte",
    "100% das aulas publicadas",
    "sem atividade recente",
    "não significa abandono",
    "366 dias",
    "38 asserções",
    "somente leitura",
    "branch `dev`",
  ]);
}

if (failures.length > 0) {
  console.error("Contrato B97 inválido:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(
  "Contrato B97 aprovado: o proprietário possui analytics acadêmico agregado sem inferir abandono nem expor alunos.",
);

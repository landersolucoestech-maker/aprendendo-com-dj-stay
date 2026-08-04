import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { relative } from "node:path";

const root = process.cwd();
const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};
const read = (path) => readFileSync(path, "utf8");

const walk = (directory) =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) return walk(path);
    return statSync(path).isFile() ? [path] : [];
  });

const dateTimePath = "src/lib/date-time.ts";
expect(existsSync(dateTimePath), "Camada temporal canônica deve existir.");
expect(
  existsSync("supabase/tests/44_datetime_utc_contract.test.sql"),
  "Contrato pgTAP de timestamps UTC deve existir.",
);

if (existsSync(dateTimePath)) {
  const dateTime = read(dateTimePath);
  for (const marker of [
    'APP_LOCALE = "pt-BR"',
    'APP_TIME_ZONE = "America/Sao_Paulo"',
    "formatAppDate",
    "formatAppDateTime",
    "formatAppTime",
    "formatAppRelativeTime",
    "toUtcIsoString",
  ]) {
    expect(dateTime.includes(marker), `Camada temporal deve declarar ${marker}.`);
  }
}

const temporalConsumers = [
  "src/components/ConnectionStatus.tsx",
  "src/lib/recent-activities.ts",
  "src/pages/CertificateValidation.tsx",
  "src/pages/Contact.tsx",
  "src/pages/Dashboard.tsx",
  "src/pages/admin/AffiliatesAdmin.tsx",
  "src/pages/admin/ContactsAdmin.tsx",
  "src/pages/admin/StudentsAdmin.tsx",
  "src/pages/affiliate/AffiliatePortal.tsx",
  "src/pages/student/Certificates.tsx",
  "src/pages/student/MyDigitalProducts.tsx",
  "src/pages/student/StudentCoursesPage.tsx",
  "src/pages/student/StudentLibraryPage.tsx",
  "src/pages/student/StudentFinancialPortal.tsx",
  "src/pages/student/StudentProfilePage.tsx",
];

for (const path of temporalConsumers) {
  expect(existsSync(path), `${path} deve existir.`);
  if (!existsSync(path)) continue;

  const source = read(path);
  expect(
    source.includes('from "@/lib/date-time"'),
    `${path} deve consumir a camada temporal canônica.`,
  );
}

const recentActivitiesHookPath = "src/hooks/useRecentActivities.ts";
expect(existsSync(recentActivitiesHookPath), `${recentActivitiesHookPath} deve existir.`);
if (existsSync(recentActivitiesHookPath)) {
  const recentActivitiesHook = read(recentActivitiesHookPath);
  expect(
    recentActivitiesHook.includes('from "@/lib/recent-activities"'),
    `${recentActivitiesHookPath} deve delegar apresentação temporal ao módulo puro B80.`,
  );
  expect(
    !recentActivitiesHook.includes('from "@/lib/date-time"') &&
      !recentActivitiesHook.includes("formatAppRelativeTime("),
    `${recentActivitiesHookPath} não pode duplicar a formatação temporal do módulo puro B80.`,
  );
}

const sourceFiles = walk("src").filter(
  (path) => /\.(?:ts|tsx)$/.test(path) && path !== dateTimePath,
);

const directTemporalPatterns = [
  /new\s+Intl\.DateTimeFormat\s*\(/,
  /new\s+Intl\.RelativeTimeFormat\s*\(/,
  /\.toLocaleDateString\s*\(/,
  /\.toLocaleTimeString\s*\(/,
];
const fabricatedAnalyticsPatterns = [
  /Math\.random\s*\(/,
  /\b(?:mock|fake|demo)(?:Metrics|Analytics|Stats|Summary)\b/i,
];

for (const path of sourceFiles) {
  const source = read(path);
  const displayPath = relative(root, path);

  for (const pattern of directTemporalPatterns) {
    expect(
      !pattern.test(source),
      `${displayPath} deve usar src/lib/date-time.ts em vez de formatação temporal direta.`,
    );
  }

  if (/(?:Dashboard|Portal|Analytics|Stats|Summary|Metrics)/i.test(displayPath)) {
    for (const pattern of fabricatedAnalyticsPatterns) {
      expect(
        !pattern.test(source),
        `${displayPath} não pode fabricar métricas ou analytics.`,
      );
    }
  }
}

const studentDashboardPath = "src/pages/student/StudentDashboardPage.tsx";
expect(existsSync(studentDashboardPath), `${studentDashboardPath} deve existir.`);
if (existsSync(studentDashboardPath)) {
  const studentDashboard = read(studentDashboardPath);
  for (const marker of [
    "useStudentCourseAccess(0, 1, 3)",
    "useStudentProgressSummary()",
    "useStudentLibrarySummary()",
    "useRecentActivities(5)",
    "access.active_total",
    "progressSummary.average_progress_percent",
    "progressSummary.completed_lessons",
    "librarySummaryQuery.data?.total ?? 0",
  ]) {
    expect(
      studentDashboard.includes(marker),
      `Painel do aluno deve usar o read model persistido por ${marker}.`,
    );
  }

  for (const forbidden of [
    "useCourseAccess",
    "useUserProgress",
    "useStudentLibrary()",
    "activeEnrollments.length",
    "progressRows.reduce",
    "library.length",
    "Math.random(",
  ]) {
    expect(
      !studentDashboard.includes(forbidden),
      `Painel do aluno não pode restaurar cálculo ou métrica local por ${forbidden}.`,
    );
  }
}

expect(
  !existsSync("src/pages/student/StudentPortal.tsx"),
  "O contrato temporal não pode depender do monólito do portal removido na B113.",
);

const affiliatePortal = read("src/pages/affiliate/AffiliatePortal.tsx");
expect(
  affiliatePortal.includes("useAffiliatePortal"),
  "Portal do afiliado deve consultar o RPC agregado.",
);
expect(
  affiliatePortal.includes("portal.summary"),
  "Portal do afiliado deve renderizar resumo persistido.",
);

const affiliateAdmin = read("src/pages/admin/AffiliatesAdmin.tsx");
expect(
  affiliateAdmin.includes("useAffiliateAdminDashboard"),
  "Administração de afiliados deve consultar o dashboard persistido.",
);
expect(
  affiliateAdmin.includes("dashboard.summary"),
  "Administração de afiliados deve renderizar resumo persistido.",
);

if (failures.length) {
  console.error("Contrato B26 inválido:\n- " + [...new Set(failures)].join("\n- "));
  process.exit(1);
}

console.log(
  `Contrato estático da FASE B26 aprovado em ${sourceFiles.length} arquivos TypeScript e ${temporalConsumers.length} consumidores temporais, com delegação B80 e read models do aluno verificados.`,
);

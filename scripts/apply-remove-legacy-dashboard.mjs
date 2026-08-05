import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";

const replaceExact = (path, before, after) => {
  const source = readFileSync(path, "utf8");
  if (!source.includes(before)) {
    throw new Error(`${path}: trecho exato não encontrado.`);
  }
  const next = source.replace(before, after);
  if (next === source) {
    throw new Error(`${path}: substituição exata não alterou o arquivo.`);
  }
  writeFileSync(path, next);
};

const replacePattern = (path, pattern, after) => {
  const source = readFileSync(path, "utf8");
  const matches = source.match(pattern);
  if (!matches || matches.length === 0) {
    throw new Error(`${path}: padrão não encontrado.`);
  }
  const next = source.replace(pattern, after);
  if (next === source) {
    throw new Error(`${path}: substituição por padrão não alterou o arquivo.`);
  }
  writeFileSync(path, next);
};

replaceExact(
  "scripts/check-auth-contract.mjs",
  '  dashboard: readFileSync("src/pages/Dashboard.tsx", "utf8"),',
  '  studentDashboard: readFileSync("src/pages/student/StudentDashboardPage.tsx", "utf8"),',
);
replaceExact(
  "scripts/check-auth-contract.mjs",
  'forbidText(files.dashboard, "Usuário Demo", "Dashboard ainda possui usuário demonstrativo.");',
  'forbidText(files.studentDashboard, "Usuário Demo", "Dashboard do aluno ainda possui usuário demonstrativo.");',
);

replaceExact(
  "scripts/check-data-contracts.mjs",
  '  "src/pages/Dashboard.tsx",',
  '  "src/pages/student/StudentCoursePage.tsx",\n  "src/pages/student/StudentDashboardPage.tsx",',
);

replaceExact(
  "scripts/check-course-progress-tests.mjs",
  '  dashboard: "src/pages/Dashboard.tsx",\n',
  "",
);
replaceExact(
  "scripts/check-course-progress-tests.mjs",
  'const dashboard = read(paths.dashboard);\n',
  "",
);
replacePattern(
  "scripts/check-course-progress-tests.mjs",
  /\nfor \(const fragment of \[\n  "useProgressCalculation",[\s\S]*?\n\);\n\nfor \(const fragment of \[\n  "useStudentCourseDetailAccess\(courseId\)",/,
  '\nfor (const fragment of [\n  "useStudentCourseDetailAccess(courseId)",',
);

replaceExact(
  "scripts/check-overall-course-progress-tests.mjs",
  '  dashboard: "src/pages/Dashboard.tsx",\n',
  "",
);
replaceExact(
  "scripts/check-overall-course-progress-tests.mjs",
  'const dashboard = read(paths.dashboard);\n',
  "",
);
replacePattern(
  "scripts/check-overall-course-progress-tests.mjs",
  /\nexpect\(\n  dashboard\.includes\('from "@\/lib\/course-progress"'\),[\s\S]*?\n\);\n\nfor \(const fragment of \[\n  'from "@\/lib\/course-progress"',/,
  '\nfor (const fragment of [\n  \'from "@/lib/course-progress"\',',
);
replaceExact(
  "scripts/check-overall-course-progress-tests.mjs",
  '  "calculateOverallCourseProgress(modulesWithProgress)",\n',
  "",
);

replaceExact(
  "scripts/check-datetime-analytics-contract.mjs",
  '  "src/pages/Dashboard.tsx",\n',
  "",
);

replaceExact(
  "scripts/check-recent-activities-tests.mjs",
  '  component: "src/components/RecentActivities.tsx",',
  '  studentDashboard: "src/pages/student/StudentDashboardPage.tsx",',
);
replaceExact(
  "scripts/check-recent-activities-tests.mjs",
  'const component = read(paths.component);',
  'const studentDashboard = read(paths.studentDashboard);',
);
replacePattern(
  "scripts/check-recent-activities-tests.mjs",
  /for \(const fragment of \[\n  'useRecentActivities, type RecentActivity',[\s\S]*?\n\}\n\nfor \(const fragment of \[\n  "recentProgressResponseSchema",/,
  `for (const fragment of [
  "useRecentActivities(5)",
  "activitiesQuery.isLoading",
  "activitiesQuery.error",
  "const activities = activitiesQuery.data ?? []",
  "activities.map((activity)",
  "activity.activity",
  "activity.time",
]) {
  expect(
    studentDashboard.includes(fragment),
    \`Dashboard do aluno B80 ausente: \${fragment}\`,
  );
}

for (const fragment of [
  "recentProgressResponseSchema",`,
);

for (const path of [
  "src/pages/Dashboard.tsx",
  "src/components/DashboardHeader.tsx",
  "src/components/UserProfile.tsx",
  "src/components/RecentActivities.tsx",
]) {
  if (!existsSync(path)) {
    throw new Error(`${path}: arquivo esperado para remoção não existe.`);
  }
  rmSync(path);
}

console.log("Dashboard legado e componentes órfãos removidos; contratos realinhados às páginas atuais.");

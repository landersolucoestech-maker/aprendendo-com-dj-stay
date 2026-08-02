import { existsSync, readFileSync } from "node:fs";

const paths = {
  pureModule: "src/lib/course-progress.ts",
  tests: "src/lib/course-progress.test.ts",
  modulesHook: "src/hooks/useModules.ts",
  progressHook: "src/hooks/useProgressCalculation.ts",
  userProgressHook: "src/hooks/useUserProgress.ts",
  dashboard: "src/pages/Dashboard.tsx",
  studentPortal: "src/pages/student/StudentPortal.tsx",
  lessonGrid: "src/components/LessonGrid.tsx",
  lessonCard: "src/components/LessonCard.tsx",
  moduleProgress: "src/components/ModuleProgress.tsx",
  documentation: "docs/refactor/FASE-B81-COURSE-PROGRESS-TESTS.md",
  package: "package.json",
};

const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

for (const path of Object.values(paths)) {
  expect(existsSync(path), `${path} deve existir.`);
}

const read = (path) => (existsSync(path) ? readFileSync(path, "utf8") : "");
const pureModule = read(paths.pureModule);
const tests = read(paths.tests);
const modulesHook = read(paths.modulesHook);
const progressHook = read(paths.progressHook);
const userProgressHook = read(paths.userProgressHook);
const dashboard = read(paths.dashboard);
const studentPortal = read(paths.studentPortal);
const lessonGrid = read(paths.lessonGrid);
const lessonCard = read(paths.lessonCard);
const moduleProgress = read(paths.moduleProgress);
const documentation = read(paths.documentation);
const packageJson = existsSync(paths.package)
  ? JSON.parse(read(paths.package))
  : { scripts: {} };

for (const fragment of [
  "ModuleLesson",
  "LearningModule",
  "ModuleLessonWithProgress",
  "ModuleWithProgress",
  "LessonCompletionProgress",
  "calculateModulesProgress",
  "calculateOverallCourseProgress",
  "readonly LearningModule[]",
  "readonly LessonCompletionProgress[]",
  "readonly ModuleWithProgress[]",
  "new Set(",
  ".filter((progress) => progress.completada)",
  ".map((progress) => progress.aula_id)",
  "completedLessonIds.has(lesson.id)",
  "Math.round((completedLessons / lessons.length) * 100)",
  "Math.round((completedLessons / totalLessons) * 100)",
  "lessons.length === 0",
  "totalLessons === 0",
  "clampProgress",
  "Math.min(100, Math.max(0, progress))",
  "progress: clampProgress(progress)",
]) {
  expect(pureModule.includes(fragment), `Módulo puro B81/B82 ausente: ${fragment}`);
}
expect(
  !pureModule.includes("react") &&
    !pureModule.includes("@tanstack/react-query") &&
    !pureModule.includes("@/integrations/supabase") &&
    !pureModule.includes("@/config/public-config"),
  "O módulo puro B81 não pode depender de React, React Query, Supabase ou configuração pública.",
);

for (const fragment of [
  "mantém módulos sem aulas em zero por cento",
  "mantém todas as aulas incompletas sem progresso confirmado",
  "arredonda a conclusão parcial do módulo",
  "arredonda dois terços para sessenta e sete por cento",
  "marca conclusão total em cem por cento",
  "não deixa linhas duplicadas inflarem o percentual",
  "considera a aula concluída quando existe ao menos uma linha verdadeira",
  "ignora progresso de aulas inexistentes no currículo",
  "preserva ordem e propriedades de módulos e aulas",
  "não altera módulos, aulas ou linhas de progresso recebidos",
  "structuredClone",
  "aceita coleção vazia de módulos",
]) {
  expect(tests.includes(fragment), `Cobertura B81 ausente: ${fragment}`);
}
expect(
  !tests.includes("@/hooks/useProgressCalculation") &&
    !tests.includes("@/hooks/useUserProgress") &&
    !tests.includes("@/integrations/supabase") &&
    !tests.includes("@/config/public-config"),
  "A suíte B81 deve permanecer independente dos hooks, Supabase e configuração pública.",
);

for (const fragment of [
  'import type { LearningModule } from "@/lib/course-progress";',
  'export type { LearningModule, ModuleLesson } from "@/lib/course-progress";',
  'from("modulos")',
  "modulesResponseSchema",
  "parseDataContract(",
]) {
  expect(modulesHook.includes(fragment), `Hook de módulos B81 ausente: ${fragment}`);
}
expect(
  !modulesHook.includes("export interface ModuleLesson") &&
    !modulesHook.includes("export interface LearningModule"),
  "useModules.ts não pode restaurar tipos locais duplicados.",
);

for (const fragment of [
  "calculateModulesProgress",
  "type LearningModule",
  "type ModuleWithProgress",
  "ModuleLessonWithProgress,",
  "ModuleWithProgress,",
  'from "@/lib/course-progress";',
  "useUserProgress()",
  "useMemo(() =>",
  "return calculateModulesProgress(modules, progressQuery.data)",
  "isLoading: progressQuery.isLoading",
  "error: progressQuery.error",
]) {
  expect(progressHook.includes(fragment), `Hook de cálculo B81 ausente: ${fragment}`);
}
expect(
  !progressHook.includes("new Map(") &&
    !progressHook.includes("Math.round(") &&
    !progressHook.includes("completedLessons") &&
    !progressHook.includes("export interface ModuleLessonWithProgress") &&
    !progressHook.includes("export interface ModuleWithProgress"),
  "useProgressCalculation.ts não pode restaurar cálculo ou tipos duplicados.",
);

for (const fragment of [
  "export type UserProgress = ProgressRow",
  "progressResponseSchema",
  'from("progresso_aulas")',
  '.eq("user_id", user.id)',
]) {
  expect(userProgressHook.includes(fragment), `Progresso persistido B81 ausente: ${fragment}`);
}

for (const fragment of [
  "useProgressCalculation",
  "type ModuleLessonWithProgress",
  "modulesQuery.data",
  "modulesWithProgress",
  "calculateOverallCourseProgress",
  "calculateOverallCourseProgress(modulesWithProgress)",
  "LessonGrid",
  "ModuleProgress",
]) {
  expect(dashboard.includes(fragment), `Dashboard B81/B82 ausente: ${fragment}`);
}
expect(
  !dashboard.includes("modulesWithProgress.reduce((total, module) => total + module.progress") &&
    !dashboard.includes("modulesWithProgress.length"),
  "Dashboard não pode restaurar média simples de percentuais dos módulos.",
);

for (const fragment of [
  "calculateOverallCourseProgress",
  "calculateOverallCourseProgress(modules)",
  "const averageProgress =",
  "row.progresso_percentual",
]) {
  expect(studentPortal.includes(fragment), `Portal do Aluno B81/B82 ausente: ${fragment}`);
}
expect(
  !studentPortal.includes("modules.reduce((total, module) => total + module.progress") &&
    !studentPortal.includes("module.progress, 0) /"),
  "Página do curso não pode restaurar média simples de percentuais dos módulos.",
);

for (const fragment of [
  "ModuleLessonWithProgress",
  "ModuleWithProgress",
  'from "@/hooks/useProgressCalculation"',
  "module.progress",
  "lesson={lesson}",
  "LessonCard",
]) {
  expect(lessonGrid.includes(fragment), `LessonGrid B81 ausente: ${fragment}`);
}

for (const fragment of [
  "ModuleLessonWithProgress",
  'from "@/hooks/useProgressCalculation"',
  "lesson.completed",
  'lesson.completed ? "Revisar" : "Assistir"',
]) {
  expect(lessonCard.includes(fragment), `LessonCard B81 ausente: ${fragment}`);
}

for (const fragment of [
  "progress: number",
  "module.progress",
  '<Progress value={module.progress}',
]) {
  expect(moduleProgress.includes(fragment), `ModuleProgress B81 ausente: ${fragment}`);
}

expect(
  documentation.includes("Fase B81") &&
    documentation.includes("Nenhuma migration") &&
    documentation.includes("Supabase remoto") &&
    documentation.includes("branch `main`"),
  "Documentação B81 deve registrar escopo e exclusões.",
);
expect(
  packageJson.scripts?.["check:course-progress-tests"] ===
    "node scripts/check-course-progress-tests.mjs",
  "package.json deve expor check:course-progress-tests.",
);
expect(
  packageJson.scripts?.typecheck?.includes("npm run check:course-progress-tests"),
  "Contrato B81 deve estar encadeado ao typecheck.",
);

const typecheck = packageJson.scripts?.typecheck ?? "";
const learningProgressIndex = typecheck.indexOf(
  "npm run check:learning-progress-contract-tests",
);
const courseProgressIndex = typecheck.indexOf("npm run check:course-progress-tests");
const recentActivitiesIndex = typecheck.indexOf("npm run check:recent-activities-tests");
expect(
  learningProgressIndex >= 0 &&
    courseProgressIndex > learningProgressIndex &&
    recentActivitiesIndex > courseProgressIndex,
  "O gate B81 deve executar após o contrato de progresso e antes das atividades recentes.",
);

if (failures.length > 0) {
  console.error("Falhas no contrato B81/B82:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(
  "Contrato B81/B82 aprovado: cálculo por módulo, progresso geral ponderado, limites defensivos e consumidores permanecem centralizados e determinísticos.",
);

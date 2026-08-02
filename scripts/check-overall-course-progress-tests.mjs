import { existsSync, readFileSync } from "node:fs";

const paths = {
  pureModule: "src/lib/course-progress.ts",
  tests: "src/lib/overall-course-progress.test.ts",
  dashboard: "src/pages/Dashboard.tsx",
  studentPortal: "src/pages/student/StudentPortal.tsx",
  b81Contract: "scripts/check-course-progress-tests.mjs",
  documentation: "docs/refactor/FASE-B82-OVERALL-COURSE-PROGRESS.md",
  package: "package.json",
};

const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};
const read = (path) => (existsSync(path) ? readFileSync(path, "utf8") : "");

for (const path of Object.values(paths)) {
  expect(existsSync(path), `${path} deve existir.`);
}

const pureModule = read(paths.pureModule);
const tests = read(paths.tests);
const dashboard = read(paths.dashboard);
const studentPortal = read(paths.studentPortal);
const b81Contract = read(paths.b81Contract);
const documentation = read(paths.documentation);
const packageJson = existsSync(paths.package)
  ? JSON.parse(read(paths.package))
  : { scripts: {} };

for (const fragment of [
  "calculateOverallCourseProgress",
  "readonly ModuleWithProgress[]",
  "let totalLessons = 0",
  "let completedLessons = 0",
  "totalLessons += module.lessons.length",
  "lesson.completed ? 1 : 0",
  "if (totalLessons === 0) return 0",
  "Math.round((completedLessons / totalLessons) * 100)",
  "clampProgress",
]) {
  expect(pureModule.includes(fragment), `Cálculo B82 ausente: ${fragment}`);
}
expect(
  !pureModule.includes("module.progress") &&
    !pureModule.includes("modules.length === 0") &&
    !pureModule.includes("total + module.progress"),
  "O progresso geral B82 não pode usar percentual ou quantidade de módulos como peso.",
);

for (const fragment of [
  "mantém currículo sem módulos em zero por cento",
  "ignora módulos vazios no denominador",
  "pondera módulos pela quantidade real de aulas",
  "não usa o percentual agregado do módulo como fonte",
  "arredonda um terço para trinta e três por cento",
  "arredonda dois terços para sessenta e sete por cento",
  "retorna cem por cento quando todas as aulas estão concluídas",
  "preserva módulos e aulas recebidos",
  "Array.from({ length: 9 }",
  "toBe(10)",
  "structuredClone",
]) {
  expect(tests.includes(fragment), `Cobertura B82 ausente: ${fragment}`);
}
expect(
  !tests.includes("@/hooks/") &&
    !tests.includes("@/integrations/supabase") &&
    !tests.includes("@tanstack/react-query"),
  "A suíte B82 deve permanecer pura e independente de hooks, Supabase e React Query.",
);

for (const [name, source, argument] of [
  ["Dashboard", dashboard, "modulesWithProgress"],
  ["Portal do Aluno", studentPortal, "modules"],
]) {
  expect(
    source.includes('from "@/lib/course-progress"'),
    `${name} deve importar o cálculo B82 do módulo puro.`,
  );
  expect(
    source.includes(`calculateOverallCourseProgress(${argument})`),
    `${name} deve calcular progresso geral por aulas.`,
  );
  expect(
    !source.includes(`${argument}.reduce((total, module) => total + module.progress`),
    `${name} não pode restaurar média simples entre módulos.`,
  );
}

for (const fragment of [
  "const averageProgress =",
  "row.progresso_percentual",
  'label="Progresso médio"',
]) {
  expect(
    studentPortal.includes(fragment),
    `A métrica separada do painel geral deve ser preservada: ${fragment}`,
  );
}

for (const fragment of [
  "calculateOverallCourseProgress",
  "calculateOverallCourseProgress(modulesWithProgress)",
  "calculateOverallCourseProgress(modules)",
  "Dashboard não pode restaurar média simples",
  "Página do curso não pode restaurar média simples",
]) {
  expect(b81Contract.includes(fragment), `Ponte B81/B82 ausente: ${fragment}`);
}

expect(
  documentation.includes("Fase B82") &&
    documentation.includes("1 aula concluída em 10") &&
    documentation.includes("Nenhuma migration") &&
    documentation.includes("Supabase remoto") &&
    documentation.includes("branch `main`"),
  "Documentação B82 deve registrar decisão, regressão e exclusões.",
);

expect(
  packageJson.scripts?.["check:overall-course-progress-tests"] ===
    "node scripts/check-overall-course-progress-tests.mjs",
  "package.json deve expor check:overall-course-progress-tests.",
);
expect(
  packageJson.scripts?.typecheck?.includes(
    "npm run check:overall-course-progress-tests",
  ),
  "Contrato B82 deve estar encadeado ao typecheck.",
);

const typecheck = packageJson.scripts?.typecheck ?? "";
const b81Index = typecheck.indexOf("npm run check:course-progress-tests");
const b82Index = typecheck.indexOf("npm run check:overall-course-progress-tests");
const recentIndex = typecheck.indexOf("npm run check:recent-activities-tests");
expect(
  b81Index >= 0 && b82Index > b81Index && recentIndex > b82Index,
  "O gate B82 deve executar após B81 e antes das atividades recentes.",
);

if (failures.length > 0) {
  console.error("Falhas no contrato B82:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(
  "Contrato B82 aprovado: progresso geral ponderado por aulas permanece puro, imutável e compartilhado pelos dois portais.",
);

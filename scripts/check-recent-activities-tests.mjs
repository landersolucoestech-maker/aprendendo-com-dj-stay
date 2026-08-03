import { existsSync, readFileSync } from "node:fs";

const paths = {
  pureModule: "src/lib/recent-activities.ts",
  tests: "src/lib/recent-activities.test.ts",
  hook: "src/hooks/useRecentActivities.ts",
  component: "src/components/RecentActivities.tsx",
  learning: "src/contracts/learning.ts",
  dateTime: "src/lib/date-time.ts",
  dateTimeContract: "scripts/check-datetime-analytics-contract.mjs",
  documentation: "docs/refactor/FASE-B80-RECENT-ACTIVITIES-TESTS.md",
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
const hook = read(paths.hook);
const component = read(paths.component);
const learning = read(paths.learning);
const dateTime = read(paths.dateTime);
const dateTimeContract = read(paths.dateTimeContract);
const documentation = read(paths.documentation);
const packageJson = existsSync(paths.package)
  ? JSON.parse(read(paths.package))
  : { scripts: {} };

for (const fragment of [
  "DEFAULT_RECENT_ACTIVITY_LIMIT = 10",
  "MAX_RECENT_ACTIVITY_LIMIT = 100",
  "RecentActivity",
  "RecentProgressRow",
  "Number.isFinite(limit)",
  "Math.trunc(limit)",
  "normalizeRecentActivityLimit",
  "toRecentActivity",
  "toRecentActivities",
  "readonly RecentProgressRow[]",
  "formatAppRelativeTime(progress.updated_at, now)",
  'type: progress.completada ? "lesson_completed" : "lesson_started"',
  "progress.progresso_percentual > 0",
]) {
  expect(pureModule.includes(fragment), `Módulo puro B80 ausente: ${fragment}`);
}
expect(
  !pureModule.includes("@tanstack/react-query") &&
    !pureModule.includes("@/integrations/supabase") &&
    !pureModule.includes("@/config/public-config"),
  "O módulo puro B80 não pode depender de React Query, Supabase ou configuração pública.",
);

for (const fragment of [
  "normaliza limite finito",
  "limita %s ao intervalo permitido",
  "usa o padrão para número não finito",
  "Number.NaN",
  "Number.POSITIVE_INFINITY",
  "Number.NEGATIVE_INFINITY",
  "transforma aula iniciada com instante explícito",
  "transforma progresso parcial sem alterar o tipo público",
  "transforma conclusão com tipo e texto próprios",
  "preserva ordem e aplica o mesmo instante de referência",
  "não altera as linhas de progresso recebidas",
  "structuredClone",
  "aceita coleção vazia",
  'time: "há 1 hora"',
]) {
  expect(tests.includes(fragment), `Cobertura B80 ausente: ${fragment}`);
}
expect(
  !tests.includes("@/hooks/useRecentActivities") &&
    !tests.includes("@/integrations/supabase") &&
    !tests.includes("@/config/public-config"),
  "A suíte B80 deve permanecer independente do hook, Supabase e configuração pública.",
);

for (const fragment of [
  "normalizeRecentActivityLimit",
  "toRecentActivities",
  'export type { RecentActivity } from "@/lib/recent-activities";',
  "export const useRecentActivities = (limit = 10)",
  'supabase.auth.getUser()',
  'from("progresso_aulas")',
  '.eq("user_id", user.id)',
  '.order("updated_at", { ascending: false })',
  ".limit(normalizedLimit)",
  "recentProgressResponseSchema",
  "parseDataContract(",
  "return toRecentActivities(progressRows)",
]) {
  expect(hook.includes(fragment), `Hook B80 ausente: ${fragment}`);
}
expect(
  !hook.includes("Math.min(100") &&
    !hook.includes("Math.trunc(limit)") &&
    !hook.includes('`Completou "${lessonTitle}"') &&
    !hook.includes('`Assistiu ${progress.progresso_percentual}%'),
  "O hook B80 não pode restaurar normalização ou apresentação duplicadas.",
);

for (const fragment of [
  'useRecentActivities, type RecentActivity',
  'type === "lesson_completed"',
  "activities.map((item)",
  "item.activity",
  "item.time",
]) {
  expect(component.includes(fragment), `Componente B80 ausente: ${fragment}`);
}

for (const fragment of [
  "recentProgressResponseSchema",
  "progressRowObjectSchema",
  ".superRefine(validateProgressRow)",
]) {
  expect(learning.includes(fragment), `Contrato de progresso B80 ausente: ${fragment}`);
}

for (const fragment of [
  "formatAppRelativeTime",
  "now: TemporalInput = Date.now()",
  "Intl.RelativeTimeFormat",
]) {
  expect(dateTime.includes(fragment), `Infraestrutura temporal B80 ausente: ${fragment}`);
}

for (const fragment of [
  '"src/lib/recent-activities.ts"',
  'const recentActivitiesHookPath = "src/hooks/useRecentActivities.ts"',
  'recentActivitiesHook.includes(\'from "@/lib/recent-activities"\')',
  '!recentActivitiesHook.includes(\'from "@/lib/date-time"\')',
  '!recentActivitiesHook.includes("formatAppRelativeTime(")',
  "com delegação B80 verificada",
]) {
  expect(dateTimeContract.includes(fragment), `Ponte B26/B80 ausente: ${fragment}`);
}
expect(
  !dateTimeContract.includes('"src/hooks/useRecentActivities.ts",\n  "src/pages/CertificateValidation.tsx"'),
  "O gate B26 não pode voltar a exigir importação temporal direta no hook B80.",
);

expect(
  documentation.includes("Fase B80") &&
    documentation.includes("Nenhuma migration") &&
    documentation.includes("Supabase remoto") &&
    documentation.includes("branch `main`"),
  "Documentação B80 deve registrar escopo e exclusões.",
);
expect(
  packageJson.scripts?.["check:recent-activities-tests"] ===
    "node scripts/check-recent-activities-tests.mjs",
  "package.json deve expor check:recent-activities-tests.",
);
expect(
  packageJson.scripts?.typecheck?.includes("npm run check:recent-activities-tests"),
  "Contrato B80 deve estar encadeado ao typecheck.",
);

const typecheck = packageJson.scripts?.typecheck ?? "";
const progressIndex = typecheck.indexOf("npm run check:learning-progress-contract-tests");
const recentIndex = typecheck.indexOf("npm run check:recent-activities-tests");
const storageIndex = typecheck.indexOf("npm run check:storage-contract-tests");
expect(
  progressIndex >= 0 && recentIndex > progressIndex && storageIndex > recentIndex,
  "O gate B80 deve executar após o contrato de progresso e antes do contrato de Storage.",
);

if (failures.length > 0) {
  console.error("Falhas no contrato B80:\n- " + failures.join("\n- "));
  process.exit(1);
}

await import("./check-student-activity-history-pagination.mjs");

console.log(
  "Contrato B80 aprovado: limite finito, imutabilidade, transformação determinística e ponte temporal B26 permanecem isolados da consulta Supabase.",
);

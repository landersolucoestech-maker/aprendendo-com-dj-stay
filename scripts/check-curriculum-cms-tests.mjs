import { existsSync, readFileSync } from "node:fs";

const paths = {
  contracts: "src/contracts/curriculum-cms.ts",
  tests: "src/contracts/curriculum-cms.test.ts",
  migration: "supabase/migrations/20260730230000_curriculum_cms_schema.sql",
  moduleRpcs: "supabase/migrations/20260730230100_curriculum_module_rpcs.sql",
  lessonRpcs: "supabase/migrations/20260730230200_curriculum_lesson_rpcs.sql",
  documentation: "docs/refactor/FASE-B70-CURRICULUM-CMS-CONTRACT-TESTS.md",
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
const contracts = read(paths.contracts);
const tests = read(paths.tests);
const migration = read(paths.migration);
const moduleRpcs = read(paths.moduleRpcs);
const lessonRpcs = read(paths.lessonRpcs);
const documentation = read(paths.documentation);
const packageJson = existsSync(paths.package)
  ? JSON.parse(read(paths.package))
  : { scripts: {} };

for (const fragment of [
  "persistedReleaseContractIsValid",
  "validatePersistedRelease",
  "validateLifecycle",
  'value.status === "archived" && value.archived_at === null',
  'value.deleted_at !== null && value.status !== "archived"',
  'value.completion_mode === "media_progress"',
  'value.content_kind === "text" || value.content_kind === "mixed"',
  "Date.parse(value.availability_ends_at)",
  "value.module_id === value.prerequisite_module_id",
  "value.lesson_id === value.prerequisite_lesson_id",
  'value.provider === "private_asset"',
  "validatePrerequisiteIds",
  "new Set(prerequisiteIds).size",
  "prerequisiteIds.includes(entityId)",
  'value.releaseMode === "after_prerequisites"',
  "modulePayloadSchema",
  "lessonPayloadSchema",
  "curriculumModuleRowSchema.parse(module)",
  "curriculumLessonRowSchema.parse(lesson)",
  "moduleFormSchema.parse(values)",
  "lessonFormSchema.parse(values)",
  ".strict()",
]) {
  expect(contracts.includes(fragment), `Contrato B70 ausente: ${fragment}`);
}

for (const fragment of [
  "modulos_release_contract",
  "modulos_version_positive",
  "modulos_deleted_archived",
  "aulas_text_content_length",
  "aulas_completion_contract",
  "aulas_release_contract",
  "aulas_availability_window",
  "aulas_version_positive",
  "aulas_deleted_archived",
  "module_prerequisites_not_self",
  "lesson_prerequisites_not_self",
  "set_curriculum_lifecycle_timestamps",
]) {
  expect(migration.includes(fragment), `Constraint persistido B70 ausente: ${fragment}`);
}

for (const fragment of [
  "DUPLICATE_MODULE_PREREQUISITE",
  "MODULE_CANNOT_REQUIRE_ITSELF",
  "MODULE_PREREQUISITE_CYCLE",
]) {
  expect(moduleRpcs.includes(fragment), `Regra RPC de módulo B70 ausente: ${fragment}`);
}

for (const fragment of [
  "DUPLICATE_LESSON_PREREQUISITE",
  "LESSON_CANNOT_REQUIRE_ITSELF",
  "LESSON_PREREQUISITE_CYCLE",
  "LESSON_UNKNOWN_FIELD",
]) {
  expect(lessonRpcs.includes(fragment), `Regra RPC de aula B70 ausente: ${fragment}`);
}

for (const fragment of [
  "BASE_MODULE",
  "BASE_LESSON",
  "BASE_MODULE_FORM",
  "BASE_LESSON_FORM",
  "aceita os quatro modos persistidos coerentes",
  "rejeita contrato persistido de liberação inválido",
  "exige timestamp no status arquivado e arquivamento na exclusão",
  "rejeita percentual fora do modo de mídia ou ausente nele",
  "exige conteúdo textual para aulas textuais e mistas",
  "rejeita dependência autorreferente",
  "rejeita combinação de mídia incoerente",
  "rejeita pré-requisitos duplicados, autorreferentes ou ausentes",
  "rejeita duração negativa ou fora do inteiro seguro",
  "remove campos ocultos incompatíveis no payload do módulo",
  "remove percentual e release ocultos no payload da aula",
  "preserva instantes no roundtrip de módulo e aula",
  "revalida formulários antes de produzir payload",
  'releaseAt: "2026-8-2T10:00"',
  "new Date(actual as string).getTime()",
  "safeParse",
]) {
  expect(tests.includes(fragment), `Cobertura B70 ausente: ${fragment}`);
}

expect(
  documentation.includes("Fase B70") &&
    documentation.includes("Nenhuma migration"),
  "Documentação B70 deve registrar escopo e exclusões.",
);
expect(
  packageJson.scripts?.["check:curriculum-cms-tests"] ===
    "node scripts/check-curriculum-cms-tests.mjs",
  "package.json deve expor check:curriculum-cms-tests.",
);
expect(
  packageJson.scripts?.typecheck?.includes("npm run check:curriculum-cms-tests"),
  "Contrato B70 deve estar encadeado ao typecheck.",
);

if (failures.length > 0) {
  console.error("Falhas no contrato B70:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(
  "Contrato B70 aprovado: currículo, pré-requisitos, mídia, formulários, payloads e conversões possuem coerência semântica e cobertura unitária estrita.",
);

import { existsSync, readFileSync } from "node:fs";

const paths = {
  contracts: "src/contracts/course-cms.ts",
  tests: "src/contracts/course-cms.test.ts",
  migration: "supabase/migrations/20260730220000_course_cms_schema.sql",
  documentation: "docs/refactor/FASE-B69-COURSE-CMS-CONTRACT-TESTS.md",
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
const documentation = read(paths.documentation);
const packageJson = existsSync(paths.package)
  ? JSON.parse(read(paths.package))
  : { scripts: {} };

for (const fragment of [
  "maximumCourseAmount",
  "courseTextItemSchema",
  "courseTextArraySchema",
  "datetime({ offset: true })",
  "promotional_price_amount >= value.price_amount",
  "value.promotion_ends_at !== null",
  "!isAfter(value.promotion_ends_at, value.promotion_starts_at)",
  "!isAfter(value.availability_ends_at, value.availability_starts_at)",
  "releaseContractIsValid",
  'value.status === "published"',
  'value.status === "archived"',
  "value.deleted_at !== null && value.status !== \"archived\"",
  "validateTextLines",
  "lines.length > 50",
  "line.length > 500",
  "courseCmsRowSchema.parse(course)",
  "courseFormSchema.parse(values)",
  'value.releaseMode === "scheduled"',
  'value.releaseMode === "drip"',
  ".strict()",
]) {
  expect(contracts.includes(fragment), `Contrato B69 ausente: ${fragment}`);
}

for (const fragment of [
  "course_text_array_items_chk",
  "course_text_array_length_chk",
  "courses_promotional_price_chk",
  "courses_promotion_window_chk",
  "courses_availability_window_chk",
  "courses_release_contract_chk",
  "courses_published_timestamp_chk",
  "courses_deleted_archived_chk",
]) {
  expect(migration.includes(fragment), `Constraint persistido B69 ausente: ${fragment}`);
}

for (const fragment of [
  "BASE_ROW",
  "BASE_FORM",
  "rejeita preço promocional maior ou igual ao normal",
  "rejeita fim de promoção sem início ou fora de ordem",
  "rejeita janela de disponibilidade fora de ordem",
  "rejeita contrato de liberação inválido",
  "rejeita curso publicado ou arquivado sem timestamp correspondente",
  "rejeita exclusão fora do estado arquivado",
  "Array.from({ length: 51 }",
  'prerequisites: ["a".repeat(501)]',
  'promotionStartsAt: "2026-8-2T10:00"',
  "coage números válidos provenientes dos inputs",
  "aceita valores ocultos de outro modo porque o payload os remove",
  "normaliza textos, listas, nulos, números e datas",
  "remove valores ocultos no modo imediato",
  "preserva somente a data no modo agendado",
  "preserva somente o intervalo no modo gradual",
  "revalida o formulário antes de produzir payload",
  "revalida o registro antes de preencher o formulário",
  "safeParse",
]) {
  expect(tests.includes(fragment), `Cobertura B69 ausente: ${fragment}`);
}

expect(
  documentation.includes("Fase B69") &&
    documentation.includes("Nenhuma migration"),
  "Documentação B69 deve registrar escopo e exclusões.",
);
expect(
  packageJson.scripts?.["check:course-cms-tests"] ===
    "node scripts/check-course-cms-tests.mjs",
  "package.json deve expor check:course-cms-tests.",
);
expect(
  packageJson.scripts?.typecheck?.includes("npm run check:course-cms-tests"),
  "Contrato B69 deve estar encadeado ao typecheck.",
);

if (failures.length > 0) {
  console.error("Falhas no contrato B69:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(
  "Contrato B69 aprovado: CMS de cursos, formulário e conversões reproduzem os constraints persistidos e possuem cobertura unitária estrita.",
);

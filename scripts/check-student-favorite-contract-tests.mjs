import { existsSync, readFileSync } from "node:fs";

const paths = {
  contracts: "src/contracts/student-favorites.ts",
  tests: "src/contracts/student-favorites.test.ts",
  migration: "supabase/migrations/20260801220000_student_favorites.sql",
  documentation: "docs/refactor/FASE-B65-STUDENT-FAVORITE-CONTRACT-TESTS.md",
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
  'from "@/contracts/checkout"',
  "studentFavoriteSubjectTypeSchema = checkoutSubjectTypeSchema",
  "datetime({ offset: true })",
  'value.startsWith("/")',
  '!value.startsWith("//")',
  '!value.includes("\\\\")',
  "z.string().trim().min(1)",
  "studentFavoriteSchema",
  "studentFavoriteListSchema",
  "studentFavoriteToggleResultSchema",
  "studentFavoriteStatusSchema",
  ".strict()",
]) {
  expect(contracts.includes(fragment), `Contrato de favoritos ausente: ${fragment}`);
}

expect(
  !contracts.includes(
    'studentFavoriteSubjectTypeSchema = z.enum(["course", "digital_product"])',
  ),
  "Favoritos não podem manter enum duplicado do tipo de checkout.",
);

for (const fragment of [
  "student_favorite_subject_type",
  "'course'",
  "'digital_product'",
  "favorite.created_at",
  "action_path",
]) {
  expect(migration.includes(fragment), `Retorno RPC B65 ausente: ${fragment}`);
}

for (const fragment of [
  "checkoutSubjectTypeSchema",
  "toBe(checkoutSubjectTypeSchema)",
  "FAVORITE",
  '"product"',
  'title: "  Curso favorito  "',
  '"https://example.com"',
  '"//example.com/path"',
  '"/\\\\example.com"',
  '"/aluno\\\\cursos"',
  'created_at: "2026-08-02T06:45:00"',
  'id: "favorito-invalido"',
  "user_id",
  "total: 0.5",
  "cursor",
  "favorite_id",
  '"true"',
  "studentFavoriteToggleResultSchema",
  "studentFavoriteStatusSchema",
  "safeParse",
]) {
  expect(tests.includes(fragment), `Cobertura B65 ausente: ${fragment}`);
}

expect(
  tests.includes("studentFavoriteSubjectTypeSchema"),
  "Suíte B65 deve cobrir o tipo canônico de favorito.",
);
expect(
  documentation.includes("Fase B65") &&
    documentation.includes("Nenhuma migration"),
  "Documentação B65 deve registrar escopo e exclusões.",
);
expect(
  packageJson.scripts?.["check:student-favorite-contract-tests"] ===
    "node scripts/check-student-favorite-contract-tests.mjs",
  "package.json deve expor check:student-favorite-contract-tests.",
);
expect(
  packageJson.scripts?.typecheck?.includes(
    "npm run check:student-favorite-contract-tests",
  ),
  "Contrato B65 deve estar encadeado ao typecheck.",
);

if (failures.length > 0) {
  console.error("Falhas no contrato B65:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(
  "Contrato B65 aprovado: favoritos reutilizam o tipo canônico, rejeitam caminhos inseguros e possuem cobertura unitária estrita.",
);

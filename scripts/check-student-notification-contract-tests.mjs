import { existsSync, readFileSync } from "node:fs";

const paths = {
  contracts: "src/contracts/student-notifications.ts",
  tests: "src/contracts/student-notifications.test.ts",
  migration: "supabase/migrations/20260801210000_student_notifications.sql",
  documentation:
    "docs/refactor/FASE-B64-STUDENT-NOTIFICATION-CONTRACT-TESTS.md",
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
  "datetime({ offset: true })",
  "/^\\/(?!\\/)/",
  "z.string().trim().min(3).max(160)",
  "z.string().trim().min(3).max(1000)",
  "studentNotificationSchema",
  "studentNotificationListSchema",
  "studentNotificationReadResultSchema",
  "studentNotificationsReadAllResultSchema",
  ".strict()",
]) {
  expect(
    contracts.includes(fragment),
    `Contrato de notificações ausente: ${fragment}`,
  );
}

for (const fragment of [
  "student_notifications_title_chk",
  "char_length(btrim(title)) between 3 and 160",
  "char_length(btrim(message)) between 3 and 1000",
  "student_notifications_action_path_chk",
]) {
  expect(migration.includes(fragment), `Constraint B64 ausente: ${fragment}`);
}

for (const fragment of [
  "NOTIFICATION",
  'title: "ab"',
  'title: "a".repeat(161)',
  'message: "ab"',
  'message: "a".repeat(1001)',
  '"https://example.com"',
  '"//example.com/path"',
  '"mailto:suporte@example.com"',
  'created_at: "2026-08-02T06:30:00"',
  'id: "notificacao-invalida"',
  "idempotency_key",
  "unread_count: 0.5",
  "cursor",
  "studentNotificationReadResultSchema",
  "studentNotificationsReadAllResultSchema",
  "safeParse",
]) {
  expect(tests.includes(fragment), `Cobertura B64 ausente: ${fragment}`);
}

expect(
  tests.includes("studentNotificationTypeSchema"),
  "Suíte B64 deve cobrir o enum de tipos de notificação.",
);
expect(
  documentation.includes("Fase B64") &&
    documentation.includes("Nenhuma migration"),
  "Documentação B64 deve registrar escopo e exclusões.",
);
expect(
  packageJson.scripts?.["check:student-notification-contract-tests"] ===
    "node scripts/check-student-notification-contract-tests.mjs",
  "package.json deve expor check:student-notification-contract-tests.",
);
expect(
  packageJson.scripts?.typecheck?.includes(
    "npm run check:student-notification-contract-tests",
  ),
  "Contrato B64 deve estar encadeado ao typecheck.",
);

if (failures.length > 0) {
  console.error("Falhas no contrato B64:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(
  "Contrato B64 aprovado: notificações e resultados de leitura possuem validação estrita, caminhos internos e cobertura unitária alinhada ao banco.",
);

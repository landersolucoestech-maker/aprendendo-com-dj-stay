import { existsSync, readFileSync } from "node:fs";

const paths = {
  migration: "supabase/migrations/20260801210000_student_notifications.sql",
  databaseTest: "supabase/tests/52_student_notifications.test.sql",
  contract: "src/contracts/student-notifications.ts",
  contractTest: "src/contracts/student-notifications.test.ts",
  hook: "src/hooks/useStudentNotifications.ts",
  page: "src/pages/student/StudentNotifications.tsx",
  parent: "scripts/check-student-notifications.mjs",
  documentation: "docs/refactor/FASE-B105-STUDENT-NOTIFICATIONS-PAGINATION.md",
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
  if (!existsSync(path)) failures.push(`Arquivo B105 ausente: ${path}`);
}

if (failures.length === 0) {
  const migration = read(paths.migration);
  const databaseTest = read(paths.databaseTest);
  const contract = read(paths.contract);
  const contractTest = read(paths.contractTest);
  const hook = read(paths.hook);
  const page = read(paths.page);
  const parent = read(paths.parent);
  const documentation = read(paths.documentation);

  requireFragments(migration, "Migration B40/B105", [
    "get_my_student_notifications",
    "p_limit integer default 30",
    "p_offset integer default 0",
    "'total'",
    "'unread_count'",
    "limit v_limit offset v_offset",
    "user_id = v_user_id",
  ]);
  requireFragments(databaseTest, "pgTAP B40/B105", [
    "select plan(24)",
    "pagination total remains complete",
    "pagination returns one notification",
    "student cannot mark another user's notification",
  ]);

  requireFragments(contract, "Contrato B105", [
    "Notificações não lidas não podem exceder o total.",
    "A página não pode conter mais notificações que o total.",
    ".superRefine((value, context) =>",
  ]);
  requireFragments(contractTest, "Teste unitário B105", [
    "aceita uma página menor que o total persistido",
    "rejeita contagens ou página maiores que o total",
  ]);

  requireFragments(hook, "Hook B105", [
    "normalizeNotificationLimit",
    "Math.min(100, Math.max(1, Math.trunc(value)))",
    "normalizeNotificationOffset",
    "Math.max(0, Math.trunc(value))",
    "notificationKeys.list(normalizedLimit, normalizedOffset)",
    "p_limit: normalizedLimit",
    "p_offset: normalizedOffset",
  ]);

  requireFragments(page, "Página B105", [
    "const pageSize = 20;",
    "const [page, setPage] = useState(0);",
    "useStudentNotifications(pageSize, page * pageSize)",
    "data.total",
    "data.unread_count",
    'aria-label="Paginação de notificações"',
    "Página {page + 1} de {totalPages}",
    "Anterior",
    "Próxima",
    "notificationsQuery.isFetching",
  ]);
  if (page.includes("const notificationsQuery = useStudentNotifications();")) {
    failures.push("Página B105 não pode permanecer presa ao primeiro lote padrão.");
  }
  if (page.includes("data.notifications.length} notificação")) {
    failures.push("Página B105 não pode usar o tamanho da página como total do histórico.");
  }

  if (!parent.includes('await import("./check-student-notifications-pagination.mjs")')) {
    failures.push("B105 não está encadeada no gate bloqueante B40.");
  }
  requireFragments(documentation, "Documentação B105", [
    "20 registros por página",
    "p_limit",
    "p_offset",
    "total",
    "auth.uid()",
    "branch `dev`",
    "Nenhuma migration",
  ]);
}

if (failures.length > 0) {
  console.error("Contrato B105 inválido:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(
  "Contrato B105 aprovado: o aluno acessa todo o histórico de notificações por paginação real no servidor.",
);

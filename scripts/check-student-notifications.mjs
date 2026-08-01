import { existsSync, readFileSync } from "node:fs";

const requiredFiles = [
  "supabase/migrations/20260801210000_student_notifications.sql",
  "supabase/tests/52_student_notifications.test.sql",
  "src/contracts/student-notifications.ts",
  "src/integrations/supabase/student-notification-rpc.ts",
  "src/hooks/useStudentNotifications.ts",
  "src/pages/student/StudentNotifications.tsx",
  "src/components/student/StudentPortalShell.tsx",
  "src/routing/lazy/student-pages.ts",
  "src/App.tsx",
  "docs/refactor/FASE-B40-STUDENT-NOTIFICATIONS.md",
  "package.json",
];

const failures = [];
for (const file of requiredFiles) {
  if (!existsSync(file)) failures.push(`Arquivo B40 ausente: ${file}`);
}

if (failures.length === 0) {
  const migration = readFileSync(requiredFiles[0], "utf8");
  const test = readFileSync(requiredFiles[1], "utf8");
  const contracts = readFileSync(requiredFiles[2], "utf8");
  const rpc = readFileSync(requiredFiles[3], "utf8");
  const hook = readFileSync(requiredFiles[4], "utf8");
  const page = readFileSync(requiredFiles[5], "utf8");
  const navigation = readFileSync(requiredFiles[6], "utf8");
  const lazyPages = readFileSync(requiredFiles[7], "utf8");
  const app = readFileSync(requiredFiles[8], "utf8");
  const docs = readFileSync(requiredFiles[9], "utf8");
  const packageJson = readFileSync(requiredFiles[10], "utf8");

  for (const fragment of [
    "student_notifications",
    "force row level security",
    "student_notifications_direct_access_denied",
    "create_student_notification",
    "get_my_student_notifications",
    "mark_my_student_notification_read",
    "mark_all_my_student_notifications_read",
    "user_id = v_user_id",
    "security invoker",
    "support_message_create_student_notification",
  ]) {
    if (!migration.toLowerCase().includes(fragment.toLowerCase())) {
      failures.push(`Migration B40 incompleta: ${fragment}`);
    }
  }
  if (migration.includes("p_user_id uuid default") || rpc.includes("p_user_id")) {
    failures.push("RPC pública B40 não pode aceitar user_id arbitrário.");
  }
  if (!test.includes("select plan(24)")) failures.push("Plano pgTAP B40 deve conter 24 asserções.");
  for (const fragment of ["studentNotificationSchema", "studentNotificationListSchema"]) {
    if (!contracts.includes(fragment)) failures.push(`Contrato B40 ausente: ${fragment}`);
  }
  for (const functionName of [
    "get_my_student_notifications",
    "mark_my_student_notification_read",
    "mark_all_my_student_notifications_read",
  ]) {
    if (!rpc.includes(`\"${functionName}\"`)) failures.push(`Cliente RPC B40 ausente: ${functionName}`);
  }
  for (const fragment of [
    "useStudentNotifications",
    "useMarkStudentNotificationRead",
    "useMarkAllStudentNotificationsRead",
  ]) {
    if (!hook.includes(fragment)) failures.push(`Hook B40 ausente: ${fragment}`);
  }
  for (const fragment of ["Notificações", "Marcar todas como lidas", "Marcar como lida"]) {
    if (!page.includes(fragment)) failures.push(`Página B40 incompleta: ${fragment}`);
  }
  if (!navigation.includes('to: "/aluno/notificacoes"')) failures.push("Navegação B40 ausente.");
  if (!lazyPages.includes("StudentNotifications")) failures.push("Lazy route B40 ausente.");
  if (!app.includes('path="/aluno/notificacoes"')) failures.push("Rota B40 ausente.");
  if (!docs.includes("não aceitam argumento `user_id`")) failures.push("Isolamento B40 não documentado.");
  if (!packageJson.includes('"check:student-notifications"')) failures.push("Script B40 ausente no package.json.");
  if (!packageJson.includes("npm run check:student-notifications")) failures.push("B40 não está integrado ao typecheck.");
}

if (failures.length > 0) {
  console.error("Contrato B40 inválido:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log("Contrato B40 aprovado: notificações transacionais estão isoladas por auth.uid().");

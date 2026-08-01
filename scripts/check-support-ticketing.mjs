import { existsSync, readFileSync } from "node:fs";

const requiredFiles = [
  "supabase/migrations/20260801200000_support_ticketing.sql",
  "supabase/migrations/20260801200100_support_ticketing_pgcrypto_hardening.sql",
  "supabase/migrations/20260801200200_support_ticketing_rls_deny.sql",
  "supabase/tests/51_support_ticketing.test.sql",
  "src/contracts/support.ts",
  "src/integrations/supabase/support-rpc.ts",
  "src/hooks/useSupportTickets.ts",
  "src/pages/student/StudentSupport.tsx",
  "src/pages/admin/SupportAdmin.tsx",
  "src/components/student/StudentPortalShell.tsx",
  "src/routing/lazy/student-pages.ts",
  "src/routing/lazy/admin-pages.ts",
  "src/App.tsx",
  "docs/refactor/FASE-B39-SUPPORT-TICKETING.md",
  "package.json",
];

const failures = [];
for (const file of requiredFiles) {
  if (!existsSync(file)) failures.push(`Arquivo B39 ausente: ${file}`);
}

if (failures.length === 0) {
  const migration = readFileSync(requiredFiles[0], "utf8");
  const hardening = readFileSync(requiredFiles[1], "utf8");
  const rlsDeny = readFileSync(requiredFiles[2], "utf8");
  const test = readFileSync(requiredFiles[3], "utf8");
  const contracts = readFileSync(requiredFiles[4], "utf8");
  const rpc = readFileSync(requiredFiles[5], "utf8");
  const hook = readFileSync(requiredFiles[6], "utf8");
  const studentPage = readFileSync(requiredFiles[7], "utf8");
  const adminPage = readFileSync(requiredFiles[8], "utf8");
  const navigation = readFileSync(requiredFiles[9], "utf8");
  const studentLazy = readFileSync(requiredFiles[10], "utf8");
  const adminLazy = readFileSync(requiredFiles[11], "utf8");
  const app = readFileSync(requiredFiles[12], "utf8");
  const docs = readFileSync(requiredFiles[13], "utf8");
  const packageJson = readFileSync(requiredFiles[14], "utf8");

  for (const fragment of [
    "support_tickets",
    "support_ticket_messages",
    "support_ticket_events",
    "force row level security",
    "AUTH_REQUIRED",
    "ADMIN_REQUIRED",
    "user_id = v_user_id",
    "SUPPORT_TICKET_CLOSED",
    "security invoker",
  ]) {
    if (!migration.toLowerCase().includes(fragment.toLowerCase())) {
      failures.push(`Migration B39 incompleta: ${fragment}`);
    }
  }
  if (!hardening.includes("extensions.digest")) failures.push("Hardening pgcrypto B39 ausente.");
  for (const policy of [
    "support_tickets_direct_access_denied",
    "support_ticket_messages_direct_access_denied",
    "support_ticket_events_direct_access_denied",
  ]) {
    if (!rlsDeny.includes(policy)) failures.push(`Política restritiva B39 ausente: ${policy}`);
  }
  if (!test.includes("select plan(33)")) failures.push("Plano pgTAP B39 deve conter 33 asserções.");
  for (const fragment of ["supportTicketSchema", "supportAdminDashboardSchema", "supportMutationResultSchema"]) {
    if (!contracts.includes(fragment)) failures.push(`Contrato B39 ausente: ${fragment}`);
  }
  for (const functionName of [
    "create_support_ticket",
    "add_my_support_message",
    "get_my_support_tickets",
    "get_support_admin_dashboard",
    "admin_reply_support_ticket",
  ]) {
    if (!rpc.includes(`\"${functionName}\"`)) failures.push(`Cliente RPC B39 ausente: ${functionName}`);
  }
  for (const fragment of ["useMySupportTickets", "useCreateSupportTicket", "useAdminReplySupportTicket"]) {
    if (!hook.includes(fragment)) failures.push(`Hook B39 ausente: ${fragment}`);
  }
  for (const fragment of ["Novo ticket", "Enviar resposta", "Tickets de suporte"]) {
    if (!studentPage.includes(fragment)) failures.push(`Portal do aluno B39 incompleto: ${fragment}`);
  }
  for (const fragment of ["Aguardando suporte", "Registrar resposta", "Tickets administrativos"]) {
    if (!adminPage.includes(fragment)) failures.push(`Admin B39 incompleto: ${fragment}`);
  }
  if (!navigation.includes('to: "/aluno/suporte"')) failures.push("Navegação do aluno não contém suporte.");
  if (!studentLazy.includes("StudentSupport")) failures.push("Lazy route do aluno não contém suporte.");
  if (!adminLazy.includes("SupportAdmin")) failures.push("Lazy route administrativa não contém suporte.");
  if (!app.includes('path="/aluno/suporte"')) failures.push("Rota /aluno/suporte ausente.");
  if (!app.includes('path="/admin/suporte"')) failures.push("Rota /admin/suporte ausente.");
  if (!docs.includes("não informa `user_id`")) failures.push("Isolamento por auth.uid não documentado.");
  if (!packageJson.includes('"check:support-ticketing"')) failures.push("Script B39 ausente no package.json.");
  if (!packageJson.includes("npm run check:support-ticketing")) failures.push("B39 não está integrado ao typecheck.");
}

if (failures.length > 0) {
  console.error("Contrato B39 inválido:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log("Contrato B39 aprovado: suporte autenticado e auditável está integrado.");

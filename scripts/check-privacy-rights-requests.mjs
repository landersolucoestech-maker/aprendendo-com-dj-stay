import { readFile } from "node:fs/promises";

const requiredFiles = [
  "supabase/migrations/20260802000000_privacy_rights_requests.sql",
  "supabase/tests/56_privacy_rights_requests.test.sql",
  "src/contracts/privacy-rights-requests.ts",
  "src/integrations/supabase/privacy-rights-rpc.ts",
  "src/hooks/usePrivacyRightsRequests.ts",
  "src/pages/student/StudentPrivacyRights.tsx",
  "src/pages/admin/PrivacyRightsAdmin.tsx",
  "docs/refactor/FASE-B44-PRIVACY-RIGHTS-REQUESTS.md",
];

const contents = Object.fromEntries(
  await Promise.all(
    requiredFiles.map(async (path) => [path, await readFile(path, "utf8")]),
  ),
);

const migration = contents[requiredFiles[0]];
const contract = contents[requiredFiles[2]];
const rpc = contents[requiredFiles[3]];
const hook = contents[requiredFiles[4]];
const studentPage = contents[requiredFiles[5]];
const adminPage = contents[requiredFiles[6]];
const documentation = contents[requiredFiles[7]];
const app = await readFile("src/App.tsx", "utf8");
const studentLazy = await readFile("src/routing/lazy/student-pages.ts", "utf8");
const adminLazy = await readFile("src/routing/lazy/admin-pages.ts", "utf8");
const navigation = await readFile(
  "src/components/student/StudentPortalShell.tsx",
  "utf8",
);

const assertions = [
  [migration.includes("force row level security"), "RLS forçada ausente"],
  [
    migration.includes("privacy_rights_requests_direct_access_denied") &&
      migration.includes("privacy_rights_request_events_direct_access_denied"),
    "políticas restritivas ausentes",
  ],
  [
    migration.includes("OPEN_PRIVACY_REQUEST_ALREADY_EXISTS"),
    "bloqueio de solicitações abertas duplicadas ausente",
  ],
  [
    migration.includes("PRIVACY_REQUEST_CANNOT_BE_CANCELLED"),
    "regra de cancelamento restrito ausente",
  ],
  [
    migration.includes("ADMIN_NOTES_REQUIRED") &&
      migration.includes("PRIVACY_REQUEST_TRANSITION_INVALID"),
    "controle de transições administrativas ausente",
  ],
  [migration.includes("security invoker"), "wrappers públicos invoker ausentes"],
  [
    contract.includes("privacyRightsRequestListSchema") &&
      contract.includes("adminUpdatePrivacyRightsRequestSchema"),
    "contratos Zod incompletos",
  ],
  [
    rpc.includes("admin_update_privacy_rights_request") &&
      rpc.includes("cancel_my_privacy_rights_request"),
    "cliente RPC incompleto",
  ],
  [
    hook.includes("useMyPrivacyRightsRequests") &&
      hook.includes("useCreatePrivacyRightsRequest") &&
      hook.includes("useCancelPrivacyRightsRequest") &&
      hook.includes("useAdminUpdatePrivacyRightsRequest"),
    "hooks de aluno ou administração ausentes",
  ],
  [
    studentPage.includes("A exclusão não é automática") &&
      studentPage.includes("Cancelar solicitação"),
    "limites e cancelamento não estão explícitos para o aluno",
  ],
  [
    adminPage.includes("useAdminPrivacyRightsRequests") &&
      adminPage.includes("useAdminUpdatePrivacyRightsRequest"),
    "painel administrativo não usa o domínio real",
  ],
  [studentLazy.includes("StudentPrivacyRights"), "lazy route do aluno ausente"],
  [adminLazy.includes("PrivacyRightsAdmin"), "lazy route administrativa ausente"],
  [app.includes('path="/aluno/privacidade"'), "rota do aluno ausente"],
  [app.includes('path="/admin/privacidade"'), "rota administrativa ausente"],
  [
    navigation.includes('to: "/aluno/privacidade"'),
    "navegação de privacidade do aluno ausente",
  ],
  [
    documentation.includes("não ocorre automaticamente") &&
      documentation.includes("estados finais"),
    "documentação de escopo e transições incompleta",
  ],
];

const failures = assertions.filter(([passed]) => !passed).map(([, message]) => message);

if (failures.length > 0) {
  console.error("Falhas no contrato B44:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  "Contrato B44 aprovado: solicitações de privacidade estão isoladas, auditáveis e sem exclusão automática.",
);

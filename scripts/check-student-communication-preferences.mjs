import { readFile } from "node:fs/promises";

const requiredFiles = [
  "supabase/migrations/20260801230000_student_communication_preferences.sql",
  "supabase/tests/54_student_communication_preferences.test.sql",
  "src/contracts/student-communication-preferences.ts",
  "src/integrations/supabase/student-communication-preferences-rpc.ts",
  "src/hooks/useStudentCommunicationPreferences.ts",
  "src/pages/student/StudentCommunicationPreferences.tsx",
  "docs/refactor/FASE-B42-STUDENT-COMMUNICATION-PREFERENCES.md",
];

const contents = Object.fromEntries(
  await Promise.all(
    requiredFiles.map(async (path) => [path, await readFile(path, "utf8")]),
  ),
);

const migration = contents[requiredFiles[0]];
const contract = contents[requiredFiles[2]];
const hook = contents[requiredFiles[4]];
const page = contents[requiredFiles[5]];
const app = await readFile("src/App.tsx", "utf8");
const navigation = await readFile(
  "src/components/student/StudentPortalShell.tsx",
  "utf8",
);

const assertions = [
  [migration.includes("force row level security"), "RLS forçada ausente"],
  [
    migration.includes("student_communication_preferences_direct_access_denied"),
    "política restritiva ausente",
  ],
  [
    migration.includes("'in_app_transactional', true"),
    "notificações internas obrigatórias ausentes",
  ],
  [
    migration.includes("CONSENT_VERSION_REQUIRED"),
    "validação de versão do consentimento ausente",
  ],
  [
    migration.includes("security invoker"),
    "wrappers públicos invoker ausentes",
  ],
  [
    contract.includes("studentCommunicationPreferencesSchema"),
    "contrato Zod ausente",
  ],
  [
    hook.includes("useUpdateStudentCommunicationPreferences"),
    "mutação React Query ausente",
  ],
  [page.includes("CONSENT_VERSION"), "versão explícita do consentimento ausente"],
  [
    page.includes("Esta fase apenas persiste preferências"),
    "limite de escopo externo não está explícito",
  ],
  [
    app.includes('path="/aluno/preferencias"'),
    "rota protegida de preferências ausente",
  ],
  [
    navigation.includes('to: "/aluno/preferencias"'),
    "navegação de preferências ausente",
  ],
];

const failures = assertions.filter(([passed]) => !passed).map(([, message]) => message);

if (failures.length > 0) {
  console.error("Falhas no contrato B42:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  "Contrato B42 aprovado: preferências opcionais estão isoladas, conservadoras e consentidas.",
);

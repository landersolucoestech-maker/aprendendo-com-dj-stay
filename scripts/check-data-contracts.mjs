import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const failures = [];

const requireText = (path, expected) => {
  const content = read(path);
  if (!content.includes(expected)) {
    failures.push(`${path}: conteúdo obrigatório ausente: ${expected}`);
  }
};

const forbidText = (path, forbidden) => {
  const content = read(path);
  if (content.includes(forbidden)) {
    failures.push(`${path}: conteúdo proibido encontrado: ${forbidden}`);
  }
};

const queryHooks = [
  "src/hooks/useLessonFiles.ts",
  "src/hooks/useLessons.ts",
  "src/hooks/useModules.ts",
  "src/hooks/useRecentActivities.ts",
  "src/hooks/useUserProfile.ts",
  "src/hooks/useUserProgress.ts",
];

for (const path of queryHooks) {
  requireText(path, "parseDataContract");
}

const domainFiles = [
  ...queryHooks,
  "src/auth/user-metadata.ts",
  "src/components/LessonCard.tsx",
  "src/components/LessonGrid.tsx",
  "src/components/VideoPlayer.tsx",
  "src/pages/Dashboard.tsx",
  "src/pages/EditProfile.tsx",
  "src/pages/Lesson.tsx",
];

const forbiddenFallbacks = [
  "Sem título",
  "Descrição não disponível",
  "15:30",
  "return data as",
  "|| []",
  "console.log",
  "console.error",
];

for (const path of domainFiles) {
  for (const forbidden of forbiddenFallbacks) {
    forbidText(path, forbidden);
  }
}

const generatedTypes = read("src/integrations/supabase/types.ts");
for (const table of [
  "asset_access_grants",
  "asset_events",
  "assets",
  "aulas",
  "courses",
  "enrollment_events",
  "enrollments",
  "lesson_media",
  "modulos",
  "playback_events",
  "playback_tokens",
  "progresso_aulas",
  "user_profiles",
]) {
  if (!generatedTypes.includes(`${table}: {`)) {
    failures.push(`src/integrations/supabase/types.ts: tabela canônica ausente: ${table}`);
  }
}

for (const ghostContract of ["lesson_files", "user_subscriptions", "criado_em", "avatar_url"]) {
  if (generatedTypes.includes(ghostContract)) {
    failures.push(`src/integrations/supabase/types.ts: contrato inexistente encontrado: ${ghostContract}`);
  }
}

requireText("src/contracts/contract-error.ts", "issues");
requireText("src/contracts/learning.ts", "progressUpdateInputSchema");
requireText("src/contracts/learning.ts", "profileMetadataInputSchema");
requireText("src/lib/error-message.ts", "DataContractError");

if (failures.length > 0) {
  console.error("Contrato de dados inválido:\n" + failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Contrato estático de dados validado.");

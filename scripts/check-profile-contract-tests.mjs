import { existsSync, readFileSync } from "node:fs";

const paths = {
  contracts: "src/contracts/profile.ts",
  learning: "src/contracts/learning.ts",
  tests: "src/contracts/profile.test.ts",
  metadata: "src/auth/user-metadata.ts",
  metadataTests: "src/auth/user-metadata.test.ts",
  profileHook: "src/hooks/useUserProfile.ts",
  avatarHook: "src/hooks/useAvatarUpload.ts",
  editPage: "src/pages/EditProfile.tsx",
  app: "src/App.tsx",
  studentPortal: "src/pages/student/StudentPortal.tsx",
  pageFrame: "src/components/student/StudentPortalPageFrame.tsx",
  generatedTypes: "src/integrations/supabase/types.ts",
  documentation: "docs/refactor/FASE-B79-PROFILE-CONTRACT-TESTS.md",
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
const learning = read(paths.learning);
const tests = read(paths.tests);
const metadata = read(paths.metadata);
const metadataTests = read(paths.metadataTests);
const profileHook = read(paths.profileHook);
const avatarHook = read(paths.avatarHook);
const editPage = read(paths.editPage);
const app = read(paths.app);
const studentPortal = read(paths.studentPortal);
const pageFrame = read(paths.pageFrame);
const generatedTypes = read(paths.generatedTypes);
const documentation = read(paths.documentation);
const packageJson = existsSync(paths.package)
  ? JSON.parse(read(paths.package))
  : { scripts: {} };

for (const fragment of [
  "profileOptionalNameSchema",
  "profileDisplayNameSchema",
  "profilePhoneSchema",
  "profileBioSchema",
  "profileOptionalHttpsUrlSchema",
  "new URL(value).protocol === \"https:\"",
  "profileMetadataInputSchema",
  "authUserMetadataSchema",
  ".passthrough()",
  "userProfileSchema",
  "avatar_asset_id: uuidSchema.nullable()",
  ".strict()",
  "ProfileMetadataInput",
  "AuthUserMetadata",
  "UserProfileRow",
]) {
  expect(contracts.includes(fragment), `Contrato B79 ausente: ${fragment}`);
}

for (const fragment of [
  "profileMetadataInputSchema,",
  "userProfileSchema,",
  "type ProfileMetadataInput,",
  "type UserProfileRow,",
  'from "@/contracts/profile";',
]) {
  expect(learning.includes(fragment), `Reexportação B79 ausente: ${fragment}`);
}
expect(
  !learning.includes("const optionalHttpsUrlSchema") &&
    !learning.includes("export const userProfileSchema =") &&
    !learning.includes("export const profileMetadataInputSchema ="),
  "learning.ts não pode restaurar contratos duplicados de perfil.",
);

for (const fragment of [
  'authUserMetadataSchema } from "@/contracts/profile"',
  "parseDataContract(",
  "authUserMetadataSchema,",
  'metadata.full_name || metadata.name || user.email?.split("@")[0] || "Aluno"',
]) {
  expect(metadata.includes(fragment), `Leitura B79 ausente: ${fragment}`);
}
expect(
  !metadata.includes('from "zod"') &&
    !metadata.includes("const optionalText") &&
    !metadata.includes("const optionalHttpsUrl") &&
    !metadata.includes("userMetadataSchema"),
  "user-metadata.ts não pode restaurar validadores Zod locais.",
);

for (const fragment of [
  "aceita perfil persistido estrito com avatar",
  "aceita perfil sem avatar",
  "rejeita UUIDs, timestamps e campos extras",
  "normaliza nome, textos e URLs antes da gravação",
  "aceita campos opcionais vazios após trim",
  "aceita os limites exatos de texto e URL",
  "EXACT_HTTPS_URL",
  "500 - EXACT_HTTPS_URL_PREFIX.length",
  "rejeita URL não HTTPS ou incompleta",
  "rejeita nome vazio, limites excedidos e campos extras",
  "reutiliza normalização e preserva metadados desconhecidos",
  "reexporta as mesmas instâncias canônicas",
  "profileOptionalHttpsUrlSchema",
  "safeParse",
]) {
  expect(tests.includes(fragment), `Cobertura B79 ausente: ${fragment}`);
}
expect(
  !tests.includes("@/hooks/useUserProfile") &&
    !tests.includes("@/integrations/supabase") &&
    !tests.includes("@/config/public-config"),
  "A suíte B79 deve permanecer independente de hooks, Supabase e configuração pública.",
);

for (const fragment of [
  "prioriza full_name e normaliza campos textuais",
  "aplica a cadeia de fallback do nome",
  "aceita URLs HTTPS completas e preserva campos desconhecidos sem expô-los",
  "rejeita URL não HTTPS",
  "rejeita textos acima dos limites e expõe contexto e issues",
]) {
  expect(metadataTests.includes(fragment), `Compatibilidade de leitura B79 ausente: ${fragment}`);
}

for (const fragment of [
  "userProfileSchema",
  "assetRowSchema",
  'from("user_profiles")',
  'from("assets")',
  '.eq("purpose", "avatar")',
  '.eq("state", "published")',
  "createSignedAssetUrl(avatar, 300)",
]) {
  expect(profileHook.includes(fragment), `Consumidor de perfil B79 ausente: ${fragment}`);
}

for (const fragment of [
  "avatarFileSchema",
  "verifyPersistedAvatarBinding",
  'from("user_profiles")',
  'select("avatar_asset_id")',
  "profile.avatar_asset_id !== assetId",
]) {
  expect(avatarHook.includes(fragment), `Vínculo de avatar B79 ausente: ${fragment}`);
}

for (const fragment of [
  "EditProfileProps",
  "studentPortal = false",
  "<StudentPortalPageFrame>",
  "profileMetadataInputSchema",
  'supabase.auth.updateUser({',
  "full_name: metadata.name",
  "instagram: metadata.instagram",
  "youtube: metadata.youtube",
  "website: metadata.website",
]) {
  expect(editPage.includes(fragment), `Gravação B79 ausente: ${fragment}`);
}

expect(
  app.includes('path="/aluno/perfil/editar" element={<StudentRoute><EditProfile studentPortal /></StudentRoute>}'),
  "Rota do aluno deve ativar o modo studentPortal do editor.",
);
expect(
  app.includes('path="/editar-perfil"') && app.includes("<EditProfile />"),
  "Rota genérica deve preservar EditProfile sem modo aluno.",
);
expect(
  studentPortal.includes('<Link to="/aluno/perfil/editar">Editar perfil</Link>'),
  "Perfil do aluno deve apontar para o editor dentro do shell.",
);
for (const fragment of [
  "getUserMetadataProfile",
  "<StudentPortalShell",
  'navigate("/login", { replace: true })',
]) {
  expect(pageFrame.includes(fragment), `Frame B85 ausente no contrato B79: ${fragment}`);
}

for (const fragment of [
  "user_profiles: {",
  "avatar_asset_id: string | null",
  "created_at: string",
  "id: string",
  "updated_at: string",
  "user_id: string",
  'foreignKeyName: "user_profiles_avatar_asset_id_fkey"',
]) {
  expect(generatedTypes.includes(fragment), `Tipo persistido B79 ausente: ${fragment}`);
}

expect(
  documentation.includes("Fase B79") &&
    documentation.includes("Nenhuma migration") &&
    documentation.includes("Supabase Auth remoto") &&
    documentation.includes("branch `main`"),
  "Documentação B79 deve registrar escopo e exclusões.",
);
expect(
  packageJson.scripts?.["check:profile-contract-tests"] ===
    "node scripts/check-profile-contract-tests.mjs",
  "package.json deve expor check:profile-contract-tests.",
);
expect(
  packageJson.scripts?.typecheck?.includes("npm run check:profile-contract-tests"),
  "Contrato B79 deve estar encadeado ao typecheck.",
);

if (failures.length > 0) {
  console.error("Falhas no contrato B79/B85:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(
  "Contrato B79/B85 aprovado: perfil persistido, gravação canônica, vínculo de avatar e modo aluno no shell permanecem cobertos sem duplicação.",
);

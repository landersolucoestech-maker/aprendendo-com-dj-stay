import { existsSync, readFileSync } from "node:fs";

const paths = {
  app: "src/App.tsx",
  editPage: "src/pages/EditProfile.tsx",
  studentPortal: "src/pages/student/StudentPortal.tsx",
  affiliatePortal: "src/pages/affiliate/AffiliatePortal.tsx",
  pageFrame: "src/components/student/StudentPortalPageFrame.tsx",
  profileContract: "scripts/check-profile-contract-tests.mjs",
  designContract: "scripts/check-design-system-contract.mjs",
  navigationContract: "scripts/check-student-navigation.mjs",
  frameContract: "scripts/check-student-page-frame.mjs",
  documentation: "docs/refactor/FASE-B85-STUDENT-PROFILE-EDITOR.md",
  package: "package.json",
};

const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};
const read = (path) => (existsSync(path) ? readFileSync(path, "utf8") : "");

for (const path of Object.values(paths)) {
  expect(existsSync(path), `${path} deve existir.`);
}

const app = read(paths.app);
const editPage = read(paths.editPage);
const studentPortal = read(paths.studentPortal);
const affiliatePortal = read(paths.affiliatePortal);
const pageFrame = read(paths.pageFrame);
const profileContract = read(paths.profileContract);
const designContract = read(paths.designContract);
const navigationContract = read(paths.navigationContract);
const frameContract = read(paths.frameContract);
const documentation = read(paths.documentation);
const packageJson = existsSync(paths.package)
  ? JSON.parse(read(paths.package))
  : { scripts: {} };

for (const fragment of [
  "interface EditProfileProps",
  "readonly studentPortal?: boolean",
  "studentPortal = false",
  'const returnPath = studentPortal ? "/aluno/perfil" : "/portal"',
  "const editorForm = (",
  "if (studentPortal)",
  "<StudentPortalPageFrame>",
  "<StudentSectionHeader",
  'variant={studentPortal ? "course" : undefined}',
  'variant={studentPortal ? "context" : "default"}',
  "profileMetadataInputSchema",
  "parseDataContract(",
  'supabase.auth.updateUser({',
  "full_name: metadata.name",
  "phone: metadata.phone",
  "bio: metadata.bio",
  "instagram: metadata.instagram",
  "youtube: metadata.youtube",
  "website: metadata.website",
  "await refreshSession()",
  "useAvatarUpload()",
  "uploadAvatar(file)",
  'accept="image/jpeg,image/png,image/webp"',
  "maxLength={120}",
  "maxLength={40}",
  "maxLength={1000}",
  "maxLength={500}",
  'placeholder="https://instagram.com/..."',
  'placeholder="https://youtube.com/..."',
  'placeholder="https://..."',
]) {
  expect(editPage.includes(fragment), `Editor B85 ausente: ${fragment}`);
}
expect(
  (editPage.match(/<StudentPortalPageFrame>/g) ?? []).length >= 3,
  "Carregamento, erro e formulário do modo aluno devem permanecer no frame.",
);
expect(
  (editPage.match(/const editorForm = \(/g) ?? []).length === 1 &&
    (editPage.match(/supabase\.auth\.updateUser\(\{/g) ?? []).length === 1 &&
    (editPage.match(/profileMetadataInputSchema/g) ?? []).length >= 2,
  "Os modos aluno e genérico devem compartilhar um único formulário, validação e fluxo de gravação.",
);
expect(
  !editPage.includes('const returnPath = "/portal"') &&
    !editPage.includes('<Link to="/portal">Cancelar</Link>'),
  "O editor não pode restaurar retorno fixo que retire o aluno do shell.",
);

expect(
  app.includes('path="/aluno/perfil/editar" element={<StudentRoute><EditProfile studentPortal /></StudentRoute>}'),
  "A rota específica do aluno deve ativar o modo studentPortal.",
);
expect(
  app.includes('path="/editar-perfil"') &&
    app.includes("<EditProfile />") &&
    app.includes('allowedRoles={["aluno", "afiliado", "administrador_proprietario"]}'),
  "A rota genérica deve permanecer disponível aos papéis autorizados sem forçar o shell do aluno.",
);
expect(
  studentPortal.includes('<Link to="/aluno/perfil/editar">Editar perfil</Link>'),
  "A seção Perfil do aluno deve usar a rota específica.",
);
expect(
  !studentPortal.includes('<Link to="/editar-perfil">Editar perfil</Link>'),
  "A seção Perfil não pode retirar o aluno do shell pela rota genérica.",
);
expect(
  affiliatePortal.includes('to="/editar-perfil"'),
  "O Portal do Afiliado deve continuar usando a rota genérica.",
);

for (const fragment of [
  "getUserMetadataProfile",
  "useAuth()",
  "<StudentPortalShell",
  'navigate("/login", { replace: true })',
]) {
  expect(pageFrame.includes(fragment), `Frame consumido por B85 ausente: ${fragment}`);
}

for (const [name, source, fragments] of [
  [
    "B79",
    profileContract,
    [
      "EditProfileProps",
      "EditProfile studentPortal",
      "profileMetadataInputSchema",
      "modo aluno no shell",
    ],
  ],
  [
    "B23",
    designContract,
    [
      "src/pages/EditProfile.tsx",
      "<StudentPortalPageFrame>",
      "modo aluno do editor",
    ],
  ],
  [
    "B83",
    navigationContract,
    [
      "/aluno/perfil/editar",
      "Editar perfil",
      "rota de detalhe permanece fora do menu",
    ],
  ],
  [
    "B84",
    frameContract,
    [
      "editProfile",
      "EditProfile studentPortal",
      "Rota de edição do aluno deve ativar o frame",
    ],
  ],
]) {
  for (const fragment of fragments) {
    expect(source.includes(fragment), `Ponte ${name}/B85 ausente: ${fragment}`);
  }
}

expect(
  documentation.includes("Fase B85") &&
    documentation.includes("/aluno/perfil/editar") &&
    documentation.includes("/editar-perfil") &&
    documentation.includes("Nenhuma migration") &&
    documentation.includes("Supabase remoto") &&
    documentation.includes("branch `main`"),
  "Documentação B85 deve registrar modo dual, compatibilidade e exclusões.",
);
expect(
  packageJson.scripts?.["check:student-profile-editor"] ===
    "node scripts/check-student-profile-editor.mjs",
  "package.json deve expor check:student-profile-editor.",
);
expect(
  packageJson.scripts?.typecheck?.includes("npm run check:student-profile-editor"),
  "Contrato B85 deve estar encadeado ao typecheck.",
);

const typecheck = packageJson.scripts?.typecheck ?? "";
const frameIndex = typecheck.indexOf("npm run check:student-page-frame");
const editorIndex = typecheck.indexOf("npm run check:student-profile-editor");
const playerIndex = typecheck.indexOf("npm run check:player-progress");
expect(
  frameIndex >= 0 && editorIndex > frameIndex && playerIndex > editorIndex,
  "O gate B85 deve executar após B84 e antes do player.",
);

if (failures.length > 0) {
  console.error("Falhas no contrato B85:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(
  "Contrato B85 aprovado: edição de perfil do aluno preserva o shell, compartilha formulário e gravação únicos e mantém a rota genérica dos demais papéis.",
);

import { existsSync, readFileSync } from "node:fs";

const paths = {
  app: "src/App.tsx",
  shell: "src/components/student/StudentPortalShell.tsx",
  frame: "src/components/student/StudentPortalPageFrame.tsx",
  certificates: "src/pages/student/Certificates.tsx",
  products: "src/pages/student/MyDigitalProducts.tsx",
  editProfile: "src/pages/EditProfile.tsx",
  studentPortal: "src/pages/student/StudentPortal.tsx",
  financialPortal: "src/pages/student/StudentFinancialPortal.tsx",
  marketplaceContract: "scripts/check-digital-marketplace-contract.mjs",
  certificateContract: "scripts/check-students-certificates-contract.mjs",
  navigationContract: "scripts/check-student-navigation.mjs",
  designSystemContract: "scripts/check-design-system-contract.mjs",
  documentation: "docs/refactor/FASE-B84-STUDENT-PAGE-FRAME.md",
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
const shell = read(paths.shell);
const frame = read(paths.frame);
const certificates = read(paths.certificates);
const products = read(paths.products);
const editProfile = read(paths.editProfile);
const studentPortal = read(paths.studentPortal);
const financialPortal = read(paths.financialPortal);
const marketplaceContract = read(paths.marketplaceContract);
const certificateContract = read(paths.certificateContract);
const navigationContract = read(paths.navigationContract);
const designSystemContract = read(paths.designSystemContract);
const documentation = read(paths.documentation);
const packageJson = existsSync(paths.package)
  ? JSON.parse(read(paths.package))
  : { scripts: {} };

for (const fragment of [
  "type ReactNode",
  "StudentPortalPageFrameProps",
  "readonly children: ReactNode",
  "getUserMetadataProfile",
  "useAuth()",
  "useNavigate()",
  "useState(false)",
  "await signOut()",
  'navigate("/login", { replace: true })',
  'title="Validando conta"',
  "<StudentPortalShell",
  "displayName={displayName}",
  'email={user.email ?? ""}',
  "isSigningOut={isSigningOut}",
  "onSignOut={() => void handleSignOut()}",
]) {
  expect(frame.includes(fragment), `Frame B84 ausente: ${fragment}`);
}
expect(
  !frame.includes("@/integrations/supabase") &&
    !frame.includes("@tanstack/react-query") &&
    !frame.includes("window.location"),
  "O frame B84 deve depender somente da sessão e do shell, sem Supabase direto, React Query ou reload global.",
);

for (const fragment of [
  "<StudentPortalPageFrame>",
  "<StudentSectionHeader",
  "useMyCertificates",
  "Abrir validação pública",
  "Imprimir",
]) {
  expect(certificates.includes(fragment), `Certificados B84 ausente: ${fragment}`);
}
expect(
  !certificates.includes("AppPageShell"),
  "Certificados do aluno não podem usar o layout isolado.",
);

for (const fragment of [
  "interface MyDigitalProductsProps",
  "readonly studentPortal?: boolean",
  "studentPortal = false",
  "if (studentPortal)",
  "<StudentPortalPageFrame>",
  "<StudentSectionHeader",
  "<DigitalProductsContent />",
  "<AppPageShell",
  "downloadPrivateAsset",
  "useMyDigitalProducts",
  "useDigitalProductDeliverables",
]) {
  expect(products.includes(fragment), `Produtos B84 ausente: ${fragment}`);
}
expect(
  (products.match(/<DigitalProductsContent \/>/g) ?? []).length === 2,
  "O mesmo conteúdo de produtos deve atender o shell do aluno e o layout genérico.",
);

for (const fragment of [
  "EditProfileProps",
  "studentPortal = false",
  "<StudentPortalPageFrame>",
  "profileMetadataInputSchema",
  "useAvatarUpload()",
]) {
  expect(editProfile.includes(fragment), `Editor de perfil B85 ausente no frame: ${fragment}`);
}
expect(
  app.includes('path="/aluno/perfil/editar" element={<StudentRoute><EditProfile studentPortal /></StudentRoute>}'),
  "Rota de edição do aluno deve ativar o frame.",
);
expect(
  studentPortal.includes('<Link to="/aluno/perfil/editar">Editar perfil</Link>'),
  "Perfil do aluno deve abrir o editor no shell.",
);

expect(
  app.includes('path="/aluno/produtos" element={<StudentRoute><MyDigitalProducts studentPortal /></StudentRoute>}'),
  "A rota do aluno deve habilitar o modo studentPortal.",
);
expect(
  app.includes('path="/meus-produtos" element={<MarketplaceRoute><MyDigitalProducts /></MarketplaceRoute>}'),
  "A rota multi-papel deve permanecer sem o shell exclusivo do aluno.",
);
expect(
  app.includes('path="/aluno/certificados" element={<StudentRoute><Certificates /></StudentRoute>}'),
  "A rota de certificados deve permanecer protegida pelo StudentRoute.",
);

for (const fragment of [
  "studentNavigation.map",
  "<StudentNavigation />",
  "<StudentNavigation mobile />",
  "displayName",
  "isSigningOut",
  'data-context="course"',
]) {
  expect(shell.includes(fragment), `Shell compartilhado B84 ausente: ${fragment}`);
}
for (const fragment of [
  "<StudentPortalShell",
  "useStudentPaymentHistory",
  'section: "orders" | "payments"',
]) {
  expect(
    financialPortal.includes(fragment),
    `Referência B38 de página independente no shell ausente: ${fragment}`,
  );
}

for (const [name, source, fragments] of [
  [
    "B16",
    marketplaceContract,
    [
      "StudentPortalPageFrame",
      "MyDigitalProducts studentPortal",
      "layout multi-papel preservado",
    ],
  ],
  [
    "B21",
    certificateContract,
    [
      "StudentPortalPageFrame.tsx",
      "<StudentPortalPageFrame>",
      "shell persistente",
    ],
  ],
  [
    "B23",
    designSystemContract,
    [
      "src/components/student/StudentPortalPageFrame.tsx",
      'data-context="course"',
      "<StudentPortalPageFrame>",
      "contexto visual delegado pelo shell",
    ],
  ],
  [
    "B83",
    navigationContract,
    [
      "pageFrame",
      "MyDigitalProducts studentPortal",
      "novas entradas preservam o shell",
    ],
  ],
]) {
  for (const fragment of fragments) {
    expect(source.includes(fragment), `Ponte ${name}/B84 ausente: ${fragment}`);
  }
}
expect(
  !designSystemContract.includes(
    'requireText("src/pages/student/Certificates.tsx", [\n  \'context="course"\'',
  ),
  "B23 não pode voltar a exigir o contexto visual diretamente em Certificates.tsx.",
);

expect(
  documentation.includes("Fase B84") &&
    documentation.includes("Certificados") &&
    documentation.includes("Meus produtos") &&
    documentation.includes("/meus-produtos") &&
    documentation.includes("Nenhuma migration") &&
    documentation.includes("Supabase remoto") &&
    documentation.includes("branch `main`"),
  "Documentação B84 deve registrar arquitetura, compatibilidade e exclusões.",
);
expect(
  packageJson.scripts?.["check:student-page-frame"] ===
    "node scripts/check-student-page-frame.mjs",
  "package.json deve expor check:student-page-frame.",
);
expect(
  packageJson.scripts?.typecheck?.includes("npm run check:student-page-frame"),
  "Contrato B84 deve estar encadeado ao typecheck.",
);

const typecheck = packageJson.scripts?.typecheck ?? "";
const navigationIndex = typecheck.indexOf("npm run check:student-navigation");
const frameIndex = typecheck.indexOf("npm run check:student-page-frame");
const playerIndex = typecheck.indexOf("npm run check:player-progress");
expect(
  navigationIndex >= 0 && frameIndex > navigationIndex && playerIndex > frameIndex,
  "O gate B84 deve executar após a navegação B83 e antes do player.",
);

if (failures.length > 0) {
  console.error("Falhas no contrato B84:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(
  "Contrato B84/B85 aprovado: certificados, produtos e editor de perfil preservam o shell; a rota genérica multi-papel continua compatível.",
);

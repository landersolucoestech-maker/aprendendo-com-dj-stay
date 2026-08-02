import { existsSync, readFileSync } from "node:fs";

const paths = {
  app: "src/App.tsx",
  shell: "src/components/student/StudentPortalShell.tsx",
  certificates: "src/pages/student/Certificates.tsx",
  products: "src/pages/student/MyDigitalProducts.tsx",
  certificateContract: "scripts/check-students-certificates-contract.mjs",
  documentation: "docs/refactor/FASE-B83-STUDENT-NAVIGATION.md",
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
const certificates = read(paths.certificates);
const products = read(paths.products);
const certificateContract = read(paths.certificateContract);
const documentation = read(paths.documentation);
const packageJson = existsSync(paths.package)
  ? JSON.parse(read(paths.package))
  : { scripts: {} };

const expectedNavigation = [
  ["/aluno", "Início", "LayoutDashboard", true],
  ["/aluno/cursos", "Meus cursos", "BookOpen", false],
  ["/aluno/certificados", "Certificados", "Award", false],
  ["/aluno/biblioteca", "Biblioteca", "Library", false],
  ["/aluno/produtos", "Meus produtos", "PackageCheck", false],
  ["/aluno/favoritos", "Favoritos", "Heart", false],
  ["/aluno/pedidos", "Pedidos", "ReceiptText", false],
  ["/aluno/pagamentos", "Pagamentos", "CreditCard", false],
  ["/aluno/notificacoes", "Notificações", "Bell", false],
  ["/aluno/suporte", "Suporte", "LifeBuoy", false],
  ["/aluno/historico", "Histórico", "History", false],
  ["/aluno/perfil", "Perfil", "UserRound", false],
  ["/aluno/preferencias", "Preferências", "Settings2", false],
  ["/aluno/privacidade", "Privacidade", "ShieldCheck", false],
];

for (const [route, label, icon, end] of expectedNavigation) {
  const entry = `{ to: "${route}", label: "${label}", icon: ${icon}, end: ${end} }`;
  expect(shell.includes(entry), `Navegação B83 ausente: ${entry}`);
  expect(
    app.includes(`path="${route}"`),
    `A rota principal ${route} deve existir em App.tsx.`,
  );
}

const navigationRoutes = [...shell.matchAll(/\{ to: "(\/aluno[^"]*)", label:/g)].map(
  (match) => match[1],
);
expect(
  navigationRoutes.length === expectedNavigation.length,
  `O menu deve possuir ${expectedNavigation.length} rotas principais; encontrou ${navigationRoutes.length}.`,
);
expect(
  new Set(navigationRoutes).size === navigationRoutes.length,
  "A navegação do aluno não pode conter caminhos duplicados.",
);
expect(
  navigationRoutes[0] === "/aluno",
  "A página inicial deve permanecer como primeira entrada do menu.",
);
expect(
  (shell.match(/end: true/g) ?? []).length === 1 &&
    shell.includes('{ to: "/aluno", label: "Início", icon: LayoutDashboard, end: true }'),
  "Somente a rota inicial deve usar correspondência exata.",
);

for (const fragment of [
  "const studentNavigation = [",
  "studentNavigation.map",
  "<StudentNavigation />",
  "<StudentNavigation mobile />",
  'aria-label="Navegação do Portal do Aluno"',
  '"Navegação móvel do Portal do Aluno"',
]) {
  expect(shell.includes(fragment), `Shell B83 ausente: ${fragment}`);
}

for (const forbiddenRoute of [
  "/aluno/cursos/:courseId",
  "/aluno/perfil/editar",
]) {
  expect(
    !navigationRoutes.includes(forbiddenRoute),
    `Rota de detalhe ${forbiddenRoute} não deve aparecer no menu principal.`,
  );
}

for (const fragment of [
  "useMyCertificates",
  "Meus certificados",
  'to="/aluno"',
]) {
  expect(certificates.includes(fragment), `Página de certificados B83 ausente: ${fragment}`);
}
for (const fragment of [
  "useMyDigitalProducts",
  "Meus produtos",
  'to="/portal"',
]) {
  expect(products.includes(fragment), `Página de produtos B83 ausente: ${fragment}`);
}

for (const fragment of [
  "src/components/student/StudentPortalShell.tsx",
  '/aluno/certificados",
  "studentNavigation.map",
  "acesso navegável aos certificados",
]) {
  expect(
    certificateContract.includes(fragment),
    `Ponte B21/B83 ausente: ${fragment}`,
  );
}

expect(
  documentation.includes("Fase B83") &&
    documentation.includes("Meus produtos") &&
    documentation.includes("Certificados") &&
    documentation.includes("Nenhuma migration") &&
    documentation.includes("Supabase remoto") &&
    documentation.includes("branch `main`"),
  "Documentação B83 deve registrar escopo e exclusões.",
);
expect(
  packageJson.scripts?.["check:student-navigation"] ===
    "node scripts/check-student-navigation.mjs",
  "package.json deve expor check:student-navigation.",
);
expect(
  packageJson.scripts?.typecheck?.includes("npm run check:student-navigation"),
  "Contrato B83 deve estar encadeado ao typecheck.",
);

const typecheck = packageJson.scripts?.typecheck ?? "";
const studentPortalIndex = typecheck.indexOf("npm run check:student-portal");
const studentNavigationIndex = typecheck.indexOf("npm run check:student-navigation");
const playerProgressIndex = typecheck.indexOf("npm run check:player-progress");
expect(
  studentPortalIndex >= 0 &&
    studentNavigationIndex > studentPortalIndex &&
    playerProgressIndex > studentNavigationIndex,
  "O gate B83 deve executar após o portal do aluno e antes do player.",
);

if (failures.length > 0) {
  console.error("Falhas no contrato B83:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(
  `Contrato B83 aprovado: ${navigationRoutes.length} rotas principais do aluno estão disponíveis no menu desktop e mobile sem duplicatas.`,
);

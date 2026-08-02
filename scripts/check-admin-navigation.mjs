import { readFile } from "node:fs/promises";

const navigation = await readFile(
  "src/components/admin/AdminNavigation.tsx",
  "utf8",
);
const app = await readFile("src/App.tsx", "utf8");
const courseLayout = await readFile(
  "src/components/admin/AdminCourseLayout.tsx",
  "utf8",
);
const documentation = await readFile(
  "docs/refactor/FASE-B45-ADMIN-NAVIGATION.md",
  "utf8",
);

const requiredRoutes = [
  "/admin",
  "/admin/cursos",
  "/admin/produtos",
  "/admin/pagamentos",
  "/admin/afiliados",
  "/admin/alunos",
  "/admin/contatos",
  "/admin/suporte",
  "/admin/privacidade",
  "/admin/erros",
];

const assertions = [
  [navigation.includes("NavLink"), "item ativo via NavLink ausente"],
  [
    navigation.includes('aria-label="Navegação administrativa"'),
    "rótulo acessível da navegação ausente",
  ],
  [
    navigation.includes("overflow-x-auto"),
    "comportamento responsivo com rolagem ausente",
  ],
  [
    navigation.includes("focus-visible:ring-2"),
    "foco visível de teclado ausente",
  ],
  [
    requiredRoutes.every((route) => navigation.includes(`to: "${route}"`)),
    "uma ou mais rotas administrativas reais estão ausentes",
  ],
  [
    app.includes("<AdminNavigation />") &&
      app.includes('allowedRoles={["administrador_proprietario"]}'),
    "navegação não está dentro do guard administrativo",
  ],
  [
    !courseLayout.includes("CMS de cursos") &&
      !courseLayout.includes('navigation={'),
    "navegação duplicada do layout de cursos ainda existe",
  ],
  [
    documentation.includes("todas as rotas protegidas") &&
      documentation.includes("sem links placeholder"),
    "documentação da cobertura administrativa está incompleta",
  ],
];

const failures = assertions.filter(([passed]) => !passed).map(([, message]) => message);

if (failures.length > 0) {
  console.error("Falhas no contrato B45:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  "Contrato B45 aprovado: todas as áreas administrativas usam navegação global, acessível e responsiva.",
);

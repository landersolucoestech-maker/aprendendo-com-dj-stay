import { existsSync, readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

const app = read("src/App.tsx");
const landing = read("src/routing/RoleLandingRedirect.tsx");
const router = read("src/pages/student/StudentPortalRouter.tsx");
const coursePage = read("src/pages/student/StudentCoursePage.tsx");
const courseDetailAccess = read("src/hooks/useStudentCourseDetailAccess.ts");
const modules = read("src/hooks/useModules.ts");
const history = read("src/hooks/useRecentActivities.ts");
const libraryPage = read("src/pages/student/StudentLibraryPage.tsx");
const library = read("src/hooks/useStudentLibraryPage.ts");
const financialPortal = read("src/pages/student/StudentFinancialPortal.tsx");
const privateAssets = read("src/lib/private-assets.ts");
const dateTime = read("src/lib/date-time.ts");
const paymentSuccess = read("src/pages/PaymentSuccess.tsx");
const legacyPortalPath = "src/pages/student/StudentPortal.tsx";

for (const route of [
  "/aluno",
  "/aluno/cursos",
  "/aluno/cursos/:courseId",
  "/aluno/biblioteca",
  "/aluno/pedidos",
  "/aluno/pagamentos",
  "/aluno/perfil",
  "/aluno/historico",
]) {
  expect(app.includes(`path=\"${route}\"`), `Rota ${route} deve existir.`);
}

expect(
  app.includes('allowedRoles={["aluno"]}'),
  "Rotas do Portal do Aluno devem exigir papel aluno.",
);
expect(
  app.includes('<Navigate to="/aluno" replace />'),
  "Rota legada /dashboard deve redirecionar para /aluno.",
);
expect(
  landing.includes('to="/aluno"'),
  "Landing do aluno deve apontar para /aluno.",
);
expect(
  paymentSuccess.includes("useCheckoutReturn") &&
    paymentSuccess.includes('to: `/aluno/cursos/${checkout.subject_id}`'),
  "Confirmação de acesso deve abrir somente o curso ligado ao checkout exato.",
);
expect(
  !paymentSuccess.includes("activeEnrollments[0]") &&
    !paymentSuccess.includes("getActiveEnrollments"),
  "Confirmação de acesso não pode usar matrícula não relacionada como fallback.",
);

expect(
  router.includes('case "dashboard":') &&
    router.includes('case "courses":') &&
    router.includes('case "course":') &&
    router.includes('case "library":') &&
    router.includes('case "orders":') &&
    router.includes('case "payments":') &&
    router.includes('case "profile":') &&
    router.includes('case "history":'),
  "Roteador do aluno deve cobrir explicitamente todas as seções públicas.",
);
expect(
  router.includes("const exhaustiveSection: never = section"),
  "Roteador do aluno deve manter verificação exaustiva em TypeScript.",
);
expect(
  !existsSync(legacyPortalPath) &&
    !router.includes('from "@/pages/student/StudentPortal"'),
  "Portal não pode restaurar o monólito legado removido.",
);

expect(
  coursePage.includes("useStudentCourseDetailAccess(courseId)"),
  "Detalhe do curso deve usar acesso direcionado ao curso solicitado.",
);
expect(
  courseDetailAccess.includes('"get_student_course_detail_access"') &&
    courseDetailAccess.includes("p_course_id: normalizedCourseId"),
  "Acesso ao detalhe deve usar a RPC direcionada e UUID validado.",
);
expect(
  !courseDetailAccess.includes('.from("enrollments")') &&
    !coursePage.includes("useCourseAccess") &&
    !coursePage.includes("getActiveEnrollments") &&
    !coursePage.includes("Date.now()") &&
    !coursePage.includes("new Date("),
  "Detalhe do curso não pode carregar todas as matrículas nem recalcular acesso no navegador.",
);
expect(
  modules.includes('.eq("course_id", courseId)'),
  "Currículo do aluno deve ser filtrado pelo curso acessado.",
);
expect(
  history.includes('.from("progresso_aulas")'),
  "Histórico deve usar progresso persistido.",
);
expect(
  history.includes('.eq("user_id", user.id)'),
  "Histórico deve restringir o usuário autenticado.",
);

expect(
  libraryPage.includes("useStudentLibraryPage(page, pageSize)"),
  "Biblioteca deve consumir o read model paginado atual.",
);
expect(
  library.includes('.from("assets")') &&
    library.includes('.eq("state", "published")') &&
    library.includes('.is("deleted_at", null)') &&
    library.includes('{ count: "exact" }') &&
    library.includes(".range(offset, offset + normalizedPageSize - 1)"),
  "Biblioteca deve usar assets publicados, não removidos e paginação persistida.",
);
expect(
  libraryPage.includes("downloadPrivateAsset"),
  "Downloads devem usar o helper privado existente.",
);
expect(
  privateAssets.includes("createSignedUrl"),
  "Downloads privados devem usar URL temporária assinada.",
);

expect(
  financialPortal.includes('readonly section: "orders" | "payments"') &&
    financialPortal.includes("useStudentPaymentHistory(page, pageSize)"),
  "Pedidos e pagamentos devem possuir estados próprios e histórico persistido.",
);
expect(
  financialPortal.includes("Pedidos reais criados pelo checkout da plataforma."),
  "Pedidos não podem simular registros antes do checkout real.",
);
expect(
  financialPortal.includes(
    "Os registros aparecerão aqui depois que um checkout real for criado para esta conta.",
  ),
  "Pagamentos não podem ser presumidos por redirecionamento.",
);
expect(
  !financialPortal.includes("mockOrders") &&
    !financialPortal.includes("mockPayments") &&
    !financialPortal.includes("Math.random("),
  "Portal não pode conter registros ou métricas financeiras fabricados.",
);
expect(
  financialPortal.includes('from "@/lib/date-time"') &&
    financialPortal.includes("formatAppDateTime") &&
    libraryPage.includes("formatAppDateTime"),
  "Páginas do portal devem usar a camada temporal canônica.",
);
expect(
  dateTime.includes('APP_TIME_ZONE = "America/Sao_Paulo"'),
  "Camada temporal deve manter o fuso America/Sao_Paulo.",
);

if (failures.length) {
  console.error("Contrato B14 inválido:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log("Contrato estático da FASE B14 aprovado.");

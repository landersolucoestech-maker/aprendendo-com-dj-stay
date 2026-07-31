import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };

const app = read("src/App.tsx");
const landing = read("src/routing/RoleLandingRedirect.tsx");
const portal = read("src/pages/student/StudentPortal.tsx");
const courseAccess = read("src/hooks/useCourseAccess.ts");
const modules = read("src/hooks/useModules.ts");
const history = read("src/hooks/useRecentActivities.ts");
const library = read("src/hooks/useStudentLibrary.ts");
const privateAssets = read("src/lib/private-assets.ts");
const paymentSuccess = read("src/pages/PaymentSuccess.tsx");

for (const route of [
  "/aluno",
  "/aluno/cursos",
  "/aluno/cursos/:courseId",
  "/aluno/biblioteca",
  "/aluno/pedidos",
  "/aluno/pagamentos",
  "/aluno/perfil",
  "/aluno/historico",
]) expect(app.includes(`path=\"${route}\"`), `Rota ${route} deve existir.`);

expect(app.includes('allowedRoles={["aluno"]}'), "Rotas do Portal do Aluno devem exigir papel aluno.");
expect(app.includes('<Navigate to="/aluno" replace />'), "Rota legada /dashboard deve redirecionar para /aluno.");
expect(landing.includes('to="/aluno"'), "Landing do aluno deve apontar para /aluno.");
expect(paymentSuccess.includes("/aluno/cursos/${activeEnrollment.course_id}"), "Confirmação de acesso deve abrir o curso real do aluno.");

expect(courseAccess.includes('.from("enrollments")'), "Cursos devem derivar de matrículas reais.");
expect(courseAccess.includes('.eq("user_id", user.id)'), "Consulta de matrículas deve restringir o usuário autenticado.");
expect(modules.includes('.eq("course_id", courseId)'), "Currículo do aluno deve ser filtrado pelo curso acessado.");
expect(history.includes('.from("progresso_aulas")'), "Histórico deve usar progresso persistido.");
expect(history.includes('.eq("user_id", user.id)'), "Histórico deve restringir o usuário autenticado.");
expect(library.includes('.from("assets")'), "Biblioteca deve usar assets persistidos.");
expect(library.includes('.eq("state", "published")'), "Biblioteca deve exibir somente assets publicados.");
expect(library.includes('.is("deleted_at", null)'), "Biblioteca deve excluir assets removidos.");
expect(portal.includes("downloadPrivateAsset"), "Downloads devem usar o helper privado existente.");
expect(privateAssets.includes("createSignedUrl"), "Downloads privados devem usar URL temporária assinada.");

expect(portal.includes('type: "orders" | "payments"'), "Pedidos e pagamentos devem possuir estados próprios.");
expect(portal.includes("Esta área não cria pedidos simulados"), "Pedidos não podem simular registros antes do checkout real.");
expect(portal.includes("Esta área não presume pagamento por redirecionamento"), "Pagamentos não podem ser confirmados pelo redirect.");
expect(!portal.includes("mockOrders") && !portal.includes("mockPayments"), "Portal não pode conter pedidos ou pagamentos mockados.");
expect(!portal.includes("Math.random("), "Portal não pode fabricar métricas aleatórias.");
expect(portal.includes('timeZone: "America/Sao_Paulo"'), "Datas do portal devem ser exibidas no fuso America/Sao_Paulo.");

if (failures.length) {
  console.error("Contrato B14 inválido:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log("Contrato estático da FASE B14 aprovado.");

import { existsSync, readFileSync } from "node:fs";

const requiredFiles = [
  "supabase/migrations/20260802230000_course_checkout_resolution.sql",
  "supabase/tests/58_course_checkout_resolution.test.sql",
  "src/contracts/course-checkout.ts",
  "src/contracts/course-checkout.test.ts",
  "src/contracts/public-course-catalog.ts",
  "src/hooks/useHostedCheckout.ts",
  "src/hooks/useCourseCheckout.ts",
  "src/pages/marketplace/CourseStorefront.tsx",
  "src/routing/lazy/commerce-pages.ts",
  "src/routing/RequireAuth.tsx",
  "src/App.tsx",
  "src/components/HeroSection.tsx",
  "scripts/check-public-course-catalog.mjs",
  "docs/refactor/FASE-B89-COURSE-STOREFRONT-CHECKOUT.md",
  "docs/STATUS.md",
];

const failures = [];
for (const file of requiredFiles) {
  if (!existsSync(file)) failures.push(`Arquivo B89 ausente: ${file}`);
}

if (failures.length === 0) {
  const read = (file) => readFileSync(file, "utf8");
  const migration = read(requiredFiles[0]);
  const databaseTest = read(requiredFiles[1]);
  const contract = read(requiredFiles[2]);
  const contractTest = read(requiredFiles[3]);
  const publicCatalogContract = read(requiredFiles[4]);
  const hostedCheckout = read(requiredFiles[5]);
  const courseCheckout = read(requiredFiles[6]);
  const storefront = read(requiredFiles[7]);
  const lazyPages = read(requiredFiles[8]);
  const requireAuth = read(requiredFiles[9]);
  const app = read(requiredFiles[10]);
  const hero = read(requiredFiles[11]);
  const parentCheck = read(requiredFiles[12]);
  const documentation = read(requiredFiles[13]);
  const status = read(requiredFiles[14]);

  for (const fragment of [
    "private.resolve_course_checkout_subject",
    "public.resolve_course_checkout_subject",
    "security definer",
    "security invoker",
    "COURSE_BUYER_ROLE_REQUIRED",
    "COURSE_NOT_AVAILABLE_FOR_CHECKOUT",
    "private.has_active_course_access",
    "'course_id', case when v_already_enrolled then null else v_course.id end",
    "grant execute on function public.resolve_course_checkout_subject(text)",
    "to authenticated",
  ]) {
    if (!migration.includes(fragment)) failures.push(`Migration B89 incompleta: ${fragment}`);
  }
  if (migration.includes("to anon")) failures.push("Resolver B89 não pode ser executável por anon.");

  for (const fragment of [
    "select plan(21)",
    "anonymous cannot resolve checkout subjects",
    "active enrollment suppresses the checkout subject identifier",
    "affiliate role cannot buy a course it cannot consume",
  ]) {
    if (!databaseTest.includes(fragment)) failures.push(`pgTAP B89 incompleto: ${fragment}`);
  }

  for (const fragment of [
    "courseCheckoutResolutionSchema",
    "courseCheckoutStartResultSchema",
    "checkout_eligible",
    "already_enrolled",
    "Estado de elegibilidade",
    ".strict()",
  ]) {
    if (!contract.includes(fragment)) failures.push(`Contrato B89 incompleto: ${fragment}`);
  }
  for (const fragment of [
    'describe("course checkout contracts"',
    "accepts an eligible authenticated course resolution",
    "rejects private fields",
  ]) {
    if (!contractTest.includes(fragment)) failures.push(`Teste unitário B89 ausente: ${fragment}`);
  }
  if (publicCatalogContract.includes("course_id:")) {
    failures.push("Catálogo público anônimo não pode expor o UUID usado no checkout.");
  }

  for (const fragment of [
    "export const createHostedCheckout",
    "prepare_checkout_intent_with_attribution",
    'supabase.functions.invoke("create-asaas-checkout"',
  ]) {
    if (!hostedCheckout.includes(fragment)) failures.push(`Serviço compartilhado de checkout incompleto: ${fragment}`);
  }

  for (const fragment of [
    '"resolve_course_checkout_subject"',
    "createHostedCheckout",
    'subjectType: "course"',
    "licenseId: null",
    'status: "already_enrolled"',
    "getHostedCheckoutIdempotencyKey",
  ]) {
    if (!courseCheckout.includes(fragment)) failures.push(`Hook de curso B89 incompleto: ${fragment}`);
  }

  for (const fragment of [
    "useCourseCheckout",
    "Comprar com Pix ou cartão",
    "Você já possui acesso ativo",
    "window.location.assign(result.checkoutUrl)",
    'to="/aluno/cursos"',
  ]) {
    if (!storefront.includes(fragment)) failures.push(`Vitrine de cursos B89 incompleta: ${fragment}`);
  }
  if (!lazyPages.includes("CourseStorefront")) failures.push("Lazy route da vitrine de cursos ausente.");

  for (const fragment of [
    "const CourseBuyerRoute",
    'allowedRoles={["aluno", "administrador_proprietario"]}',
    'path="/cursos"',
    "<CourseStorefront />",
  ]) {
    if (!app.includes(fragment)) failures.push(`Roteamento B89 incompleto: ${fragment}`);
  }
  if (!requireAuth.includes('state={{ from: location }}')) {
    failures.push("Login obrigatório não preserva o retorno para a vitrine de cursos.");
  }
  for (const fragment of [
    "`/cursos?curso=${encodeURIComponent(featuredCourse.slug)}`",
    'featuredCourse ? "Comprar curso" : "Criar conta"',
  ]) {
    if (!hero.includes(fragment)) failures.push(`CTA público B89 incompleto: ${fragment}`);
  }

  if (!parentCheck.includes('await import("./check-course-storefront.mjs")')) {
    failures.push("B89 não está encadeada no gate bloqueante do catálogo público.");
  }
  for (const fragment of [
    "resolução autenticada por slug",
    "matrícula ativa",
    "checkout hospedado",
    "branch `dev`",
  ]) {
    if (!documentation.includes(fragment)) failures.push(`Documentação B89 incompleta: ${fragment}`);
  }
  if (!status.includes("Vitrine autenticada de cursos")) failures.push("STATUS não registra a B89.");
}

if (failures.length > 0) {
  console.error("Contrato B89 inválido:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(
  "Contrato B89 aprovado: cursos publicados possuem compra autenticada sem expor o subject id ao catálogo anônimo.",
);

import { existsSync, readFileSync } from "node:fs";

const paths = {
  migration: "supabase/migrations/20260802230000_course_checkout_resolution.sql",
  databaseTest: "supabase/tests/58_course_checkout_resolution.test.sql",
  contract: "src/contracts/course-checkout.ts",
  contractTest: "src/contracts/course-checkout.test.ts",
  publicCatalogContract: "src/contracts/public-course-catalog.ts",
  hostedCheckout: "src/hooks/useHostedCheckout.ts",
  courseCheckout: "src/hooks/useCourseCheckout.ts",
  storefront: "src/pages/marketplace/CourseStorefront.tsx",
  lazyPages: "src/routing/lazy/commerce-pages.ts",
  requireAuth: "src/routing/RequireAuth.tsx",
  routeState: "src/routing/route-state.ts",
  routeStateTest: "src/routing/route-state.test.ts",
  authService: "src/auth/auth-service.ts",
  login: "src/pages/Login.tsx",
  register: "src/pages/Register.tsx",
  verifyEmail: "src/pages/VerifyEmail.tsx",
  verified: "src/pages/Verified.tsx",
  studentShell: "src/components/student/StudentPortalShell.tsx",
  app: "src/App.tsx",
  hero: "src/components/HeroSection.tsx",
  parentCheck: "scripts/check-public-course-catalog.mjs",
  documentation: "docs/refactor/FASE-B89-COURSE-STOREFRONT-CHECKOUT.md",
  status: "docs/STATUS.md",
};

const failures = [];
const read = (path) => readFileSync(path, "utf8");
for (const path of Object.values(paths)) {
  if (!existsSync(path)) failures.push(`Arquivo B89 ausente: ${path}`);
}

if (failures.length === 0) {
  const migration = read(paths.migration);
  const databaseTest = read(paths.databaseTest);
  const contract = read(paths.contract);
  const contractTest = read(paths.contractTest);
  const publicCatalogContract = read(paths.publicCatalogContract);
  const hostedCheckout = read(paths.hostedCheckout);
  const courseCheckout = read(paths.courseCheckout);
  const storefront = read(paths.storefront);
  const lazyPages = read(paths.lazyPages);
  const requireAuth = read(paths.requireAuth);
  const routeState = read(paths.routeState);
  const routeStateTest = read(paths.routeStateTest);
  const authService = read(paths.authService);
  const login = read(paths.login);
  const register = read(paths.register);
  const verifyEmail = read(paths.verifyEmail);
  const verified = read(paths.verified);
  const studentShell = read(paths.studentShell);
  const app = read(paths.app);
  const hero = read(paths.hero);
  const parentCheck = read(paths.parentCheck);
  const documentation = read(paths.documentation);
  const status = read(paths.status);

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
  for (const fragment of [
    '{ to: "/cursos", label: "Comprar cursos", icon: ShoppingCart, end: false }',
    "ShoppingCart",
  ]) {
    if (!studentShell.includes(fragment)) failures.push(`Descoberta B89 ausente no portal: ${fragment}`);
  }

  for (const fragment of [
    "getSafeInternalPath",
    "toSafeReturnLocation",
    'value.startsWith("//")',
    'value.includes("\\\\")',
  ]) {
    if (!routeState.includes(fragment)) failures.push(`Sanitização B89 incompleta: ${fragment}`);
  }
  for (const fragment of [
    'describe("safe return paths"',
    "preserves an internal course path with query string",
    "rejects protocol-relative and backslash redirects",
  ]) {
    if (!routeStateTest.includes(fragment)) failures.push(`Teste de retorno B89 ausente: ${fragment}`);
  }
  for (const fragment of [
    "signupCallbackPath",
    "getSafeInternalPath(returnPath)",
    "emailRedirectTo: absoluteAppUrl(signupCallbackPath",
  ]) {
    if (!authService.includes(fragment)) failures.push(`Callback de cadastro B89 incompleto: ${fragment}`);
  }
  if (!login.includes("state={location.state}")) failures.push("Login não preserva o curso ao abrir o cadastro.");
  for (const fragment of [
    "const returnPath = getSafeReturnPath(location.state)",
    "returnPath,",
    "navigate(returnPath, { replace: true })",
    "state={location.state}",
  ]) {
    if (!register.includes(fragment)) failures.push(`Cadastro B89 incompleto: ${fragment}`);
  }
  for (const fragment of [
    "registration.returnPath",
    "resendSignupConfirmation",
    "state={{ from: returnLocation }}",
  ]) {
    if (!verifyEmail.includes(fragment)) failures.push(`Verificação B89 incompleta: ${fragment}`);
  }
  for (const fragment of [
    'searchParams.get("return")',
    "toSafeReturnLocation(returnPath)",
    "state={primaryState}",
  ]) {
    if (!verified.includes(fragment)) failures.push(`Confirmação B89 incompleta: ${fragment}`);
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

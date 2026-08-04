import { existsSync, readFileSync } from "node:fs";

const requiredFiles = [
  "supabase/migrations/20260802213000_public_course_catalog.sql",
  "supabase/tests/57_public_course_catalog.test.sql",
  "src/contracts/public-course-catalog.ts",
  "src/contracts/public-course-catalog.test.ts",
  "src/hooks/usePublicCourseCatalog.ts",
  "src/runtime/load-public-course-catalog.ts",
  "src/runtime/ci-runtime-smoke-catalog.ts",
  "src/runtime/ci-runtime-smoke-catalog.test.ts",
  "src/components/HeroSection.tsx",
  "src/components/CourseModulesSection.tsx",
  "src/components/BenefitsSection.tsx",
  "src/components/InstructorSection.tsx",
  "src/components/OperationalTrustSection.tsx",
  "src/components/Navigation.tsx",
  "src/pages/Index.tsx",
  "scripts/check-course-storefront.mjs",
  "scripts/check-exact-checkout-return.mjs",
  "docs/refactor/FASE-B88-PUBLIC-COURSE-CATALOG.md",
  "docs/STATUS.md",
  "package.json",
];

const removedFiles = [
  "src/components/TestimonialsSection.tsx",
  "src/components/VideoTestimonialModal.tsx",
];

const failures = [];
const read = (file) => readFileSync(file, "utf8");
const requireFragments = (source, label, fragments) => {
  for (const fragment of fragments) {
    if (!source.includes(fragment)) failures.push(`${label}: conteúdo obrigatório ausente: ${fragment}`);
  }
};

for (const file of requiredFiles) {
  if (!existsSync(file)) failures.push(`Arquivo B88/B127 ausente: ${file}`);
}
for (const file of removedFiles) {
  if (existsSync(file)) failures.push(`Conteúdo público fictício não removido: ${file}`);
}

if (failures.length === 0) {
  const migration = read(requiredFiles[0]);
  const databaseTest = read(requiredFiles[1]);
  const contract = read(requiredFiles[2]);
  const contractTest = read(requiredFiles[3]);
  const hook = read(requiredFiles[4]);
  const loader = read(requiredFiles[5]);
  const syntheticCatalog = read(requiredFiles[6]);
  const syntheticCatalogTest = read(requiredFiles[7]);
  const hero = read(requiredFiles[8]);
  const courses = read(requiredFiles[9]);
  const benefits = read(requiredFiles[10]);
  const instructor = read(requiredFiles[11]);
  const trust = read(requiredFiles[12]);
  const navigation = read(requiredFiles[13]);
  const index = read(requiredFiles[14]);
  const documentation = read(requiredFiles[17]);
  const status = read(requiredFiles[18]);
  const packageJson = read(requiredFiles[19]);

  requireFragments(migration, "Migration B88", [
    "create or replace function private.get_public_course_catalog()",
    "security definer",
    "create or replace function public.get_public_course_catalog()",
    "security invoker",
    "course_record.status = 'published'",
    "course_record.availability_starts_at",
    "module_record.status = 'published'",
    "lesson_record.status = 'published'",
    "grant execute on function public.get_public_course_catalog() to anon, authenticated",
  ]);
  for (const forbidden of ["'cover_asset_id'", "'thumbnail_asset_id'", "'version'", "'created_by_user_id'"]) {
    if (migration.includes(forbidden)) failures.push(`Payload B88 expõe campo privado: ${forbidden}`);
  }

  requireFragments(databaseTest, "pgTAP B88", [
    "set local role anon",
    "catalog exposes only currently visible published courses",
    "draft modules are excluded",
    "draft lessons are excluded",
    "catalog does not expose private asset identifiers",
  ]);
  requireFragments(contract, "Contrato B88", [
    "publicCourseCatalogSchema",
    "publicCourseModuleSchema",
    ".strict()",
    "Total público diverge dos módulos persistidos",
    "Sem promoção ativa",
  ]);
  requireFragments(contractTest, "Teste unitário B88", [
    'describe("publicCourseCatalogSchema"',
    "rejects totals that diverge",
    "rejects private or administrative fields",
  ]);
  requireFragments(hook, "Hook B88/B127", [
    'supabase.rpc("get_public_course_catalog")',
    "ciRuntimeSmokeEnabled",
    "loadPublicCourseCatalog",
  ]);
  requireFragments(loader, "Loader B127", [
    "if (runtimeSmokeEnabled)",
    "ciRuntimeSmokeCatalog",
    "parseDataContract",
    '"catálogo sintético do smoke de runtime"',
    '"catálogo público de cursos"',
    "const { data, error } = await executeRpc()",
  ]);
  requireFragments(syntheticCatalog, "Fixture B127", [
    'ciRuntimeSmokeCourseTitle = "Curso de validação do runtime"',
    'slug: "curso-validacao-runtime"',
    'language_code: "pt-BR"',
    'currency_code: "BRL"',
    "satisfies PublicCourseCatalog",
  ]);
  requireFragments(syntheticCatalogTest, "Teste B127", [
    'describe("ci runtime smoke catalog"',
    'it("não invoca a RPC no modo sintético"',
    "expect(executeRpc).not.toHaveBeenCalled()",
    'it("mantém a RPC real fora do modo sintético"',
    "expect(executeRpc).toHaveBeenCalledTimes(1)",
  ]);
  if (hook.includes('.from("courses")')) failures.push("Hook público não pode consultar courses diretamente.");

  for (const source of [hero, courses]) {
    if (!source.includes("usePublicCourseCatalog")) failures.push("Hero e catálogo devem consumir o read model público.");
  }
  requireFragments(hero, "Hero B88", ["featuredCourse.module_count"]);
  requireFragments(courses, "Catálogo B88", ["course.modules.map", "course.effective_price_amount"]);
  requireFragments(index, "Home B88", ["OperationalTrustSection"]);
  requireFragments(navigation, "Navegação B88", ['{ label: "Transparência", sectionId: "transparencia" }']);
  requireFragments(trust, "Transparência B88", [
    "Esta página não publica números de alunos",
    "Progresso persistido",
    "Certificados verificáveis",
  ]);

  const publicSurface = [hero, courses, benefits, instructor, trust, navigation, index].join("\n");
  for (const forbidden of [
    "Curso #1",
    "+2.500 alunos",
    "4.9/5 estrelas",
    "500+",
    "500M+",
    "200+",
    "Top 1",
    "MC Kevinho",
    "MC Kekel",
    "Comunidade VIP",
    "reconhecido no mercado musical",
    "12x de R$ 29,70",
    "Vídeo será carregado em breve",
    "Fake video overlay",
  ]) {
    if (publicSurface.includes(forbidden)) failures.push(`Alegação pública não comprovada: ${forbidden}`);
  }

  requireFragments(documentation, "Documentação B88", [
    "read model público",
    "depoimentos",
    "identificadores privados",
    "branch `dev`",
  ]);
  if (!status.includes("Catálogo público")) failures.push("STATUS não registra o catálogo público B88.");
  requireFragments(packageJson, "package.json B88", [
    '"check:public-course-catalog"',
    "npm run check:public-course-catalog",
  ]);
}

if (failures.length > 0) {
  console.error("Contrato B88/B127 inválido:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(
  "Contrato B88/B127 aprovado: catálogo real deriva do CMS e o smoke sintético usa fixture validada sem invocar a RPC.",
);

await import("./check-course-storefront.mjs");
await import("./check-exact-checkout-return.mjs");

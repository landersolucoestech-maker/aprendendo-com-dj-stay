import { existsSync, readFileSync } from "node:fs";

const requiredFiles = [
  "supabase/migrations/20260802213000_public_course_catalog.sql",
  "supabase/tests/57_public_course_catalog.test.sql",
  "src/contracts/public-course-catalog.ts",
  "src/contracts/public-course-catalog.test.ts",
  "src/hooks/usePublicCourseCatalog.ts",
  "src/components/HeroSection.tsx",
  "src/components/CourseModulesSection.tsx",
  "src/components/BenefitsSection.tsx",
  "src/components/InstructorSection.tsx",
  "src/components/OperationalTrustSection.tsx",
  "src/components/Navigation.tsx",
  "src/pages/Index.tsx",
  "docs/refactor/FASE-B88-PUBLIC-COURSE-CATALOG.md",
  "docs/STATUS.md",
  "package.json",
];

const removedFiles = [
  "src/components/TestimonialsSection.tsx",
  "src/components/VideoTestimonialModal.tsx",
];

const failures = [];
for (const file of requiredFiles) {
  if (!existsSync(file)) failures.push(`Arquivo B88 ausente: ${file}`);
}
for (const file of removedFiles) {
  if (existsSync(file)) failures.push(`Conteúdo público fictício não removido: ${file}`);
}

if (failures.length === 0) {
  const read = (file) => readFileSync(file, "utf8");
  const migration = read(requiredFiles[0]);
  const databaseTest = read(requiredFiles[1]);
  const contract = read(requiredFiles[2]);
  const contractTest = read(requiredFiles[3]);
  const hook = read(requiredFiles[4]);
  const hero = read(requiredFiles[5]);
  const courses = read(requiredFiles[6]);
  const benefits = read(requiredFiles[7]);
  const instructor = read(requiredFiles[8]);
  const trust = read(requiredFiles[9]);
  const navigation = read(requiredFiles[10]);
  const index = read(requiredFiles[11]);
  const documentation = read(requiredFiles[12]);
  const status = read(requiredFiles[13]);
  const packageJson = read(requiredFiles[14]);

  for (const fragment of [
    "create or replace function private.get_public_course_catalog()",
    "security definer",
    "create or replace function public.get_public_course_catalog()",
    "security invoker",
    "course_record.status = 'published'",
    "course_record.availability_starts_at",
    "module_record.status = 'published'",
    "lesson_record.status = 'published'",
    "grant execute on function public.get_public_course_catalog() to anon, authenticated",
  ]) {
    if (!migration.includes(fragment)) failures.push(`Migration B88 incompleta: ${fragment}`);
  }
  for (const forbidden of ["'cover_asset_id'", "'thumbnail_asset_id'", "'version'", "'created_by_user_id'"]) {
    if (migration.includes(forbidden)) failures.push(`Payload B88 expõe campo privado: ${forbidden}`);
  }

  for (const fragment of [
    "set local role anon",
    "catalog exposes only currently visible published courses",
    "draft modules are excluded",
    "draft lessons are excluded",
    "catalog does not expose private asset identifiers",
  ]) {
    if (!databaseTest.includes(fragment)) failures.push(`pgTAP B88 incompleto: ${fragment}`);
  }

  for (const fragment of [
    "publicCourseCatalogSchema",
    "publicCourseModuleSchema",
    ".strict()",
    "Total público diverge dos módulos persistidos",
    "Sem promoção ativa",
  ]) {
    if (!contract.includes(fragment)) failures.push(`Contrato B88 incompleto: ${fragment}`);
  }
  for (const fragment of [
    'describe("publicCourseCatalogSchema"',
    "rejects totals that diverge",
    "rejects private or administrative fields",
  ]) {
    if (!contractTest.includes(fragment)) failures.push(`Teste unitário B88 ausente: ${fragment}`);
  }

  for (const fragment of [
    'supabase.rpc("get_public_course_catalog")',
    "parseDataContract",
    '"catálogo público de cursos"',
  ]) {
    if (!hook.includes(fragment)) failures.push(`Hook B88 incompleto: ${fragment}`);
  }
  if (hook.includes('.from("courses")')) failures.push("Hook público não pode consultar courses diretamente.");

  for (const source of [hero, courses]) {
    if (!source.includes("usePublicCourseCatalog")) {
      failures.push("Hero e catálogo devem consumir o read model público.");
    }
  }
  if (!hero.includes("featuredCourse.module_count")) failures.push("Hero não apresenta módulos persistidos.");
  if (!courses.includes("course.modules.map")) failures.push("Catálogo não apresenta módulos publicados.");
  if (!courses.includes("course.effective_price_amount")) failures.push("Catálogo não apresenta preço efetivo persistido.");

  if (!index.includes("OperationalTrustSection")) failures.push("Home não usa a seção de transparência operacional.");
  if (!navigation.includes('{ label: "Transparência", sectionId: "transparencia" }')) {
    failures.push("Navegação pública não aponta para transparência.");
  }
  for (const fragment of [
    "Esta página não publica números de alunos",
    "Progresso persistido",
    "Certificados verificáveis",
  ]) {
    if (!trust.includes(fragment)) failures.push(`Transparência B88 incompleta: ${fragment}`);
  }

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

  for (const fragment of [
    "read model público",
    "depoimentos",
    "identificadores privados",
    "branch `dev`",
  ]) {
    if (!documentation.includes(fragment)) failures.push(`Documentação B88 incompleta: ${fragment}`);
  }
  if (!status.includes("Catálogo público")) failures.push("STATUS não registra o catálogo público B88.");
  if (!packageJson.includes('"check:public-course-catalog"')) failures.push("Script B88 ausente no package.json.");
  if (!packageJson.includes("npm run check:public-course-catalog")) failures.push("B88 não participa do typecheck.");
}

if (failures.length > 0) {
  console.error("Contrato B88 inválido:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(
  "Contrato B88 aprovado: catálogo público deriva do CMS e a home não contém alegações comerciais fictícias.",
);

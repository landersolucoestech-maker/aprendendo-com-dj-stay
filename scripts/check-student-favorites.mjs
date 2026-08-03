import { existsSync, readFileSync } from "node:fs";

const requiredFiles = [
  "supabase/migrations/20260801220000_student_favorites.sql",
  "supabase/tests/53_student_favorites.test.sql",
  "src/contracts/student-favorites.ts",
  "src/integrations/supabase/student-favorite-rpc.ts",
  "src/hooks/useStudentFavorites.ts",
  "src/components/student/FavoriteToggleButton.tsx",
  "src/pages/student/StudentFavorites.tsx",
  "src/pages/marketplace/DigitalMarketplace.tsx",
  "src/components/student/StudentPortalShell.tsx",
  "src/routing/lazy/student-pages.ts",
  "src/App.tsx",
  "docs/refactor/FASE-B41-STUDENT-FAVORITES.md",
  "package.json",
];

const failures = [];
for (const file of requiredFiles) {
  if (!existsSync(file)) failures.push(`Arquivo B41 ausente: ${file}`);
}

if (failures.length === 0) {
  const migration = readFileSync(requiredFiles[0], "utf8");
  const test = readFileSync(requiredFiles[1], "utf8");
  const contracts = readFileSync(requiredFiles[2], "utf8");
  const rpc = readFileSync(requiredFiles[3], "utf8");
  const hook = readFileSync(requiredFiles[4], "utf8");
  const button = readFileSync(requiredFiles[5], "utf8");
  const page = readFileSync(requiredFiles[6], "utf8");
  const marketplace = readFileSync(requiredFiles[7], "utf8");
  const navigation = readFileSync(requiredFiles[8], "utf8");
  const lazyPages = readFileSync(requiredFiles[9], "utf8");
  const app = readFileSync(requiredFiles[10], "utf8");
  const docs = readFileSync(requiredFiles[11], "utf8");
  const packageJson = readFileSync(requiredFiles[12], "utf8");

  for (const fragment of [
    "student_favorites",
    "student_favorites_direct_access_denied",
    "toggle_my_student_favorite",
    "get_my_student_favorites",
    "is_my_student_favorite",
    "user_id = v_user_id",
    "status = 'published'",
    "deleted_at is null",
    "security invoker",
  ]) {
    if (!migration.toLowerCase().includes(fragment.toLowerCase())) {
      failures.push(`Migration B41 incompleta: ${fragment}`);
    }
  }
  if (migration.includes("p_user_id")) failures.push("RPC B41 não pode aceitar user_id.");
  if (!test.includes("select plan(24)")) failures.push("Plano pgTAP B41 deve conter 24 asserções.");
  for (const fragment of ["studentFavoriteSchema", "studentFavoriteListSchema", "studentFavoriteToggleResultSchema"]) {
    if (!contracts.includes(fragment)) failures.push(`Contrato B41 ausente: ${fragment}`);
  }
  for (const functionName of ["toggle_my_student_favorite", "get_my_student_favorites", "is_my_student_favorite"]) {
    if (!rpc.includes(`\"${functionName}\"`)) failures.push(`Cliente RPC B41 ausente: ${functionName}`);
  }
  for (const fragment of ["useStudentFavorites", "useStudentFavoriteStatus", "useToggleStudentFavorite"]) {
    if (!hook.includes(fragment)) failures.push(`Hook B41 ausente: ${fragment}`);
  }
  if (!button.includes("FavoriteToggleButton")) failures.push("Botão reutilizável B41 ausente.");
  for (const fragment of ["Favoritos", "Explorar marketplace", "Nenhum favorito"]) {
    if (!page.includes(fragment)) failures.push(`Página B41 incompleta: ${fragment}`);
  }
  if (!marketplace.includes('subjectType="digital_product"')) failures.push("Marketplace não integra favoritos.");
  if (!navigation.includes('to: "/aluno/favoritos"')) failures.push("Navegação B41 ausente.");
  if (!lazyPages.includes("StudentFavorites")) failures.push("Lazy route B41 ausente.");
  if (!app.includes('path="/aluno/favoritos"')) failures.push("Rota B41 ausente.");
  if (!docs.includes("não aceitam `user_id`")) failures.push("Isolamento B41 não documentado.");
  if (!packageJson.includes('"check:student-favorites"')) failures.push("Script B41 ausente no package.json.");
  if (!packageJson.includes("npm run check:student-favorites")) failures.push("B41 não está integrado ao typecheck.");
}

if (failures.length > 0) {
  console.error("Contrato B41 inválido:\n- " + failures.join("\n- "));
  process.exit(1);
}

await import("./check-student-favorites-pagination.mjs");

console.log("Contrato B41 aprovado: favoritos estão isolados e integrados.");

import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

const app = read("src/App.tsx");
const lesson = read("src/pages/Lesson.tsx");
const player = read("src/components/VideoPlayer.tsx");
const migrations = [
  read("supabase/migrations/20260730200000_course_access_schema.sql"),
  read("supabase/migrations/20260730200100_course_access_rpcs.sql"),
].join("\n");

expect(migrations.includes("private.has_active_course_access"), "A autorização de curso deve ser resolvida no banco.");
expect(migrations.includes("SERVICE_ROLE_REQUIRED"), "A confirmação de compra deve exigir service_role.");
expect(!app.includes("VITE_DISABLE_AUTH"), "Bypass de autenticação não pode existir.");
expect(!lesson.includes("getPublicUrl("), "A página de aula não pode gerar URL pública.");
expect(!player.includes("getPublicUrl("), "O player não pode gerar URL pública.");

if (failures.length > 0) {
  console.error("Contrato B10 inválido:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log("Contrato estático inicial da FASE B10 aprovado.");

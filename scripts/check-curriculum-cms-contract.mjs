import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };
const migrations = [
  read("supabase/migrations/20260730230000_curriculum_cms_schema.sql"),
  read("supabase/migrations/20260730230100_curriculum_module_rpcs.sql"),
  read("supabase/migrations/20260730230200_curriculum_lesson_rpcs.sql"),
  read("supabase/migrations/20260730230300_curriculum_access.sql"),
].join("\n");

for (const wrapper of [
  "create_module", "update_module", "set_module_prerequisites", "reorder_modules",
  "archive_module", "delete_module", "duplicate_module", "create_lesson", "update_lesson",
  "set_lesson_prerequisites", "reorder_lessons", "move_lesson", "duplicate_lesson",
  "archive_lesson", "delete_lesson", "archive_lesson_material",
]) expect(migrations.includes(`public.${wrapper}`), `RPC ${wrapper} deve existir.`);

expect(migrations.includes("revoke insert, update, delete on table public.modulos from authenticated"), "Escrita direta de módulos deve ser revogada.");
expect(migrations.includes("revoke insert, update, delete on table public.aulas from authenticated"), "Escrita direta de aulas deve ser revogada.");
expect(migrations.includes("MODULE_VERSION_CONFLICT"), "Conflitos concorrentes de módulo devem ser rejeitados.");
expect(migrations.includes("LESSON_VERSION_CONFLICT"), "Conflitos concorrentes de aula devem ser rejeitados.");
expect(migrations.includes("MODULE_PREREQUISITE_CYCLE"), "Ciclos de módulo devem ser rejeitados.");
expect(migrations.includes("LESSON_PREREQUISITE_CYCLE"), "Ciclos de aula devem ser rejeitados.");
expect(migrations.includes("MODULE_HAS_DEPENDENCIES_ARCHIVE_REQUIRED"), "Exclusão de módulo deve validar dependências.");
expect(migrations.includes("LESSON_HAS_DEPENDENCIES_ARCHIVE_REQUIRED"), "Exclusão de aula deve validar dependências.");
expect(migrations.includes("private.lesson_available_to_user"), "Acesso à aula deve considerar disponibilidade real.");
expect(migrations.includes("PUBLISHED_LESSON_REQUIRED_FOR_EACH_MODULE"), "Publicação do curso deve exigir currículo publicável.");
expect(migrations.includes("private.issue_lesson_playback_token"), "Playback deve respeitar disponibilidade curricular.");
expect(migrations.includes("media_and_assets_copied',false"), "Duplicação não pode copiar mídia ou assets implicitamente.");
expect(!migrations.includes("security definer set search_path='public'"), "Funções privilegiadas não podem usar search_path público.");

if (failures.length) {
  console.error("Contrato B12 inválido:\n- " + failures.join("\n- "));
  process.exit(1);
}
console.log("Contrato estático da FASE B12 aprovado.");

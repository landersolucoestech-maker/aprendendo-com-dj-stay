import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };

const app = read("src/App.tsx");
const courses = read("src/pages/admin/CoursesAdmin.tsx");
const editor = read("src/pages/admin/CourseEditor.tsx");
const page = read("src/pages/admin/CourseCurriculum.tsx");
const card = read("src/components/admin/CurriculumModuleCard.tsx");
const moduleDialog = read("src/components/admin/ModuleEditorDialog.tsx");
const lessonDialog = read("src/components/admin/LessonEditorDialog.tsx");
const assetsDialog = read("src/components/admin/LessonAssetsDialog.tsx");
const hook = read("src/hooks/useCurriculumCms.ts");
const upload = read("src/hooks/useLessonAssetUpload.ts");
const contract = read("src/contracts/curriculum-cms.ts");
const migrations = [
  read("supabase/migrations/20260730230000_curriculum_cms_schema.sql"),
  read("supabase/migrations/20260730230100_curriculum_module_rpcs.sql"),
  read("supabase/migrations/20260730230200_curriculum_lesson_rpcs.sql"),
  read("supabase/migrations/20260730230300_curriculum_access.sql"),
  read("supabase/migrations/20260730230400_fix_curriculum_playback_enrollment_alias.sql"),
  read("supabase/migrations/20260730230500_fix_curriculum_rpc_argument_names.sql"),
  read("supabase/migrations/20260730230600_fix_curriculum_test_contracts.sql"),
  read("supabase/migrations/20260731022000_curriculum_foreign_key_indexes.sql"),
].join("\n");

for (const wrapper of [
  "create_module", "update_module", "set_module_prerequisites", "reorder_modules",
  "archive_module", "delete_module", "duplicate_module", "create_lesson", "update_lesson",
  "set_lesson_prerequisites", "reorder_lessons", "move_lesson", "duplicate_lesson",
  "archive_lesson", "delete_lesson", "archive_lesson_material",
]) expect(migrations.includes(`public.${wrapper}`), `RPC ${wrapper} deve existir.`);

expect(app.includes('path="/admin/cursos/:courseId/curriculo"'), "Currículo deve possuir rota administrativa protegida.");
expect(courses.includes("ListTree") && courses.includes("/curriculo"), "Lista de cursos deve abrir o currículo.");
expect(editor.includes("/curriculo"), "Editor de curso deve abrir o currículo.");
expect(page.includes("reorderModules") && page.includes("moveLesson") && page.includes("upsertPrivateMedia"), "Página deve operar ordenação, movimentação e mídia privada.");
expect(card.includes("onDuplicateModule") && card.includes("onDeleteLesson") && card.includes("onAssets"), "Cards devem expor todo o ciclo editorial.");
expect(moduleDialog.includes("prerequisiteIds") && moduleDialog.includes("releaseMode"), "Módulos devem editar dependências e liberação.");
expect(lessonDialog.includes("completionMode") && lessonDialog.includes("availabilityEndsAt"), "Aulas devem editar conclusão e disponibilidade.");
expect(assetsDialog.includes("onExternalMedia") && assetsDialog.includes("onPrivateVideo") && assetsDialog.includes("onMaterial"), "Mídia externa, privada e materiais devem ser administráveis.");
expect(hook.includes('supabase.rpc("reorder_modules"') && hook.includes('supabase.rpc("move_lesson"'), "Escrita deve usar RPCs auditadas.");
expect(hook.includes("p_expected_version") && hook.includes("p_expected_course_version"), "Mutações devem usar versões otimistas.");
expect(upload.includes('p_lesson_id: lessonId') && upload.includes('p_target_state: "published"'), "Uploads devem vincular a aula e publicar via lifecycle privado.");
expect(contract.includes("modulePrerequisiteRowSchema") && contract.includes("lessonMediaRowSchema"), "Contrato deve representar dependências e mídia.");
expect(migrations.includes("revoke insert, update, delete on table public.modulos from authenticated"), "Escrita direta de módulos deve ser revogada.");
expect(migrations.includes("revoke insert, update, delete on table public.aulas from authenticated"), "Escrita direta de aulas deve ser revogada.");
expect(migrations.includes("MODULE_VERSION_CONFLICT") && migrations.includes("LESSON_VERSION_CONFLICT"), "Conflitos concorrentes devem ser rejeitados.");
expect(migrations.includes("MODULE_PREREQUISITE_CYCLE") && migrations.includes("LESSON_PREREQUISITE_CYCLE"), "Ciclos de dependências devem ser rejeitados.");
expect(migrations.includes("MODULE_HAS_DEPENDENCIES_ARCHIVE_REQUIRED") && migrations.includes("LESSON_HAS_DEPENDENCIES_ARCHIVE_REQUIRED"), "Exclusões devem validar dependências.");
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

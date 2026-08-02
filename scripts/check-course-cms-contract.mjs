import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };

const app = read("src/App.tsx");
const redirect = read("src/routing/RoleLandingRedirect.tsx");
const navigation = read("src/components/admin/AdminNavigation.tsx");
const editor = read("src/pages/admin/CourseEditor.tsx");
const preview = read("src/pages/admin/CoursePreview.tsx");
const list = read("src/pages/admin/CoursesAdmin.tsx");
const hook = read("src/hooks/useCourseCms.ts");
const contract = read("src/contracts/course-cms.ts");
const migrations = [
  read("supabase/migrations/20260730220000_course_cms_schema.sql"),
  read("supabase/migrations/20260730220100_course_cms_rpcs.sql"),
  read("supabase/migrations/20260730220110_course_cms_update_rpc.sql"),
  read("supabase/migrations/20260730220120_course_cms_lifecycle_rpcs.sql"),
  read("supabase/migrations/20260730220130_course_cms_rpc_grants.sql"),
  read("supabase/migrations/20260730220200_course_cms_access.sql"),
].join("\n");

expect(app.includes('path="/admin/cursos"'), "A lista administrativa deve possuir rota protegida.");
expect(app.includes('path="/admin/cursos/:courseId/preview"'), "O preview deve possuir rota administrativa.");
expect(redirect.includes('<Navigate to="/admin" replace />'), "O administrador deve entrar no módulo administrativo.");
expect(navigation.includes('{ to: "/admin/cursos", label: "Cursos"'), "O CMS deve permanecer acessível pela navegação administrativa.");
expect(editor.includes("courseToFormValues(courseQuery.data)"), "A edição deve carregar integralmente o registro persistido.");
expect(editor.includes("form.reset(courseToFormValues(updated))"), "Após salvar, o formulário deve usar a resposta persistida.");
expect(!editor.includes('defaultValue=""'), "Campos de edição não podem ser reconstruídos com strings vazias fixas.");
expect(preview.includes("course.objectives.map"), "O preview deve usar os objetivos persistidos.");
expect(list.includes("mutations.duplicate"), "A lista deve permitir duplicação real.");
expect(hook.includes('supabase.rpc("update_course"'), "Edição deve usar RPC auditada.");
expect(hook.includes("p_expected_version"), "Edição deve usar versão otimista.");
expect(contract.includes("promotional_price_amount"), "Contrato deve representar preço promocional.");
expect(contract.includes("affiliate_eligible"), "Contrato deve representar elegibilidade de afiliados.");
expect(migrations.includes("revoke insert, update, delete on table public.courses from authenticated"), "Escrita direta de cursos deve ser revogada.");
expect(migrations.includes("COURSE_VERSION_CONFLICT"), "Conflitos concorrentes devem ser rejeitados.");
expect(migrations.includes("COURSE_HAS_DEPENDENCIES_ARCHIVE_REQUIRED"), "Exclusão deve ser controlada por dependências.");
expect(migrations.includes("private.assert_course_publishable"), "Publicação deve validar completude editorial.");
expect(migrations.includes("course_editor_events"), "Operações editoriais devem ser auditadas.");
expect(migrations.includes("private.has_active_course_access"), "Disponibilidade editorial deve integrar autorização do aluno.");
expect(!migrations.includes("SECURITY DEFINER\nset search_path = 'public'"), "Funções privilegiadas não podem usar search_path público.");

if (failures.length) {
  console.error("Contrato B11 inválido:\n- " + failures.join("\n- "));
  process.exit(1);
}
console.log("Contrato estático da FASE B11 aprovado.");

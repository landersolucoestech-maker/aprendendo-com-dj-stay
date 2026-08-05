import { ArrowLeft, Eye, Plus, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";

import { AdminCourseLayout } from "@/components/admin/AdminCourseLayout";
import { CurriculumModuleCard } from "@/components/admin/CurriculumModuleCard";
import { LessonAssetsDialog, LessonEditorDialog, ModuleEditorDialog } from "@/components/admin/CurriculumEditorDialogs";
import { Button } from "@/components/ui/button";
import type {
  CurriculumLessonRow,
  CurriculumModuleRow,
  LessonFormValues,
  ModuleFormValues,
} from "@/contracts/curriculum-cms";
import type { AssetRow } from "@/contracts/storage";
import { useAdminCourse } from "@/hooks/useCourseCms";
import { useAdminCurriculum, useCurriculumCmsMutations } from "@/hooks/useCurriculumCms";
import { useLessonAssetUpload, type LessonUploadPurpose } from "@/hooks/useLessonAssetUpload";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/error-message";

interface ModuleDialogState { readonly open: boolean; readonly module: CurriculumModuleRow | null }
interface LessonDialogState { readonly open: boolean; readonly module: CurriculumModuleRow | null; readonly lesson: CurriculumLessonRow | null }

const CourseCurriculum = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const courseQuery = useAdminCourse(courseId);
  const curriculumQuery = useAdminCurriculum(courseId);
  const mutations = useCurriculumCmsMutations(courseId ?? "missing");
  const assetUpload = useLessonAssetUpload();
  const [moduleDialog, setModuleDialog] = useState<ModuleDialogState>({ open: false, module: null });
  const [lessonDialog, setLessonDialog] = useState<LessonDialogState>({ open: false, module: null, lesson: null });
  const [assetsLesson, setAssetsLesson] = useState<CurriculumLessonRow | null>(null);

  const snapshot = curriculumQuery.data;
  const modules = useMemo(() => snapshot?.modules ?? [], [snapshot?.modules]);
  const lessons = useMemo(() => snapshot?.lessons ?? [], [snapshot?.lessons]);
  const modulePrerequisites = snapshot?.modulePrerequisites ?? [];
  const lessonPrerequisites = snapshot?.lessonPrerequisites ?? [];
  const media = snapshot?.media ?? [];
  const assets = snapshot?.assets ?? [];
  const busy = Object.values(mutations).some((mutation) => mutation.isPending) || assetUpload.isUploading;

  const lessonsByModule = useMemo(() => {
    const grouped = new Map<string, CurriculumLessonRow[]>();
    for (const module of modules) grouped.set(module.id, []);
    for (const lesson of lessons) grouped.get(lesson.modulo_id)?.push(lesson);
    return grouped;
  }, [lessons, modules]);

  const notifyError = (title: string, error: unknown) => toast({ title, description: getErrorMessage(error), variant: "destructive" });

  const submitModule = async (values: ModuleFormValues) => {
    try {
      const saved = moduleDialog.module
        ? await mutations.updateModule.mutateAsync({ module: moduleDialog.module, values })
        : await mutations.createModule.mutateAsync(values);
      await mutations.setModulePrerequisites.mutateAsync({ module: saved, prerequisiteIds: values.prerequisiteIds });
      setModuleDialog({ open: false, module: null });
      toast({ title: moduleDialog.module ? "Módulo atualizado" : "Módulo criado" });
    } catch (error: unknown) { notifyError("Não foi possível salvar o módulo", error); }
  };

  const submitLesson = async (values: LessonFormValues) => {
    if (!lessonDialog.module) return;
    try {
      const saved = lessonDialog.lesson
        ? await mutations.updateLesson.mutateAsync({ lesson: lessonDialog.lesson, values })
        : await mutations.createLesson.mutateAsync({ moduleId: lessonDialog.module.id, values });
      await mutations.setLessonPrerequisites.mutateAsync({ lesson: saved, prerequisiteIds: values.prerequisiteIds });
      setLessonDialog({ open: false, module: null, lesson: null });
      toast({ title: lessonDialog.lesson ? "Aula atualizada" : "Aula criada" });
    } catch (error: unknown) { notifyError("Não foi possível salvar a aula", error); }
  };

  const moveModule = async (module: CurriculumModuleRow, direction: -1 | 1) => {
    if (!courseQuery.data) return;
    const index = modules.findIndex((item) => item.id === module.id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= modules.length) return;
    const ordered = [...modules];
    [ordered[index], ordered[target]] = [ordered[target]!, ordered[index]!];
    try { await mutations.reorderModules.mutateAsync({ course: courseQuery.data, modules: ordered }); }
    catch (error: unknown) { notifyError("Não foi possível reordenar os módulos", error); }
  };

  const moveLesson = async (module: CurriculumModuleRow, lesson: CurriculumLessonRow, direction: -1 | 1) => {
    const moduleLessons = lessonsByModule.get(module.id) ?? [];
    const index = moduleLessons.findIndex((item) => item.id === lesson.id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= moduleLessons.length) return;
    const ordered = [...moduleLessons];
    [ordered[index], ordered[target]] = [ordered[target]!, ordered[index]!];
    try { await mutations.reorderLessons.mutateAsync({ module, lessons: ordered }); }
    catch (error: unknown) { notifyError("Não foi possível reordenar as aulas", error); }
  };

  const moveLessonToModule = async (source: CurriculumModuleRow, lesson: CurriculumLessonRow) => {
    const targets = modules.filter((item) => item.id !== source.id && item.status !== "archived");
    if (targets.length === 0) return toast({ title: "Nenhum módulo de destino disponível" });
    const choice = window.prompt(targets.map((item, index) => `${index + 1} — ${item.titulo}`).join("\n"), "1");
    const target = choice ? targets[Number(choice) - 1] : undefined;
    if (!target) return;
    try { await mutations.moveLesson.mutateAsync({ lesson, sourceModule: source, targetModule: target }); }
    catch (error: unknown) { notifyError("Não foi possível mover a aula", error); }
  };

  const duplicateModule = async (module: CurriculumModuleRow) => {
    const title = window.prompt("Título da cópia", `${module.titulo} — Cópia`);
    if (!title?.trim()) return;
    try { await mutations.duplicateModule.mutateAsync({ moduleId: module.id, title: title.trim() }); }
    catch (error: unknown) { notifyError("Não foi possível duplicar o módulo", error); }
  };

  const duplicateLesson = async (lesson: CurriculumLessonRow) => {
    const title = window.prompt("Título da cópia", `${lesson.titulo} — Cópia`);
    if (!title?.trim()) return;
    try { await mutations.duplicateLesson.mutateAsync({ lessonId: lesson.id, title: title.trim() }); }
    catch (error: unknown) { notifyError("Não foi possível duplicar a aula", error); }
  };

  const archiveModule = async (module: CurriculumModuleRow) => {
    if (!window.confirm(`Arquivar o módulo “${module.titulo}” e suas aulas?`)) return;
    try { await mutations.archiveModule.mutateAsync(module); }
    catch (error: unknown) { notifyError("Não foi possível arquivar o módulo", error); }
  };

  const archiveLesson = async (lesson: CurriculumLessonRow) => {
    if (!window.confirm(`Arquivar a aula “${lesson.titulo}”?`)) return;
    try { await mutations.archiveLesson.mutateAsync(lesson); }
    catch (error: unknown) { notifyError("Não foi possível arquivar a aula", error); }
  };

  const deleteModule = async (module: CurriculumModuleRow) => {
    if (!window.confirm(`Excluir o módulo vazio “${module.titulo}”? Dependências impedem exclusões inseguras.`)) return;
    try { await mutations.deleteModule.mutateAsync(module); }
    catch (error: unknown) { notifyError("Exclusão bloqueada", error); }
  };

  const deleteLesson = async (lesson: CurriculumLessonRow) => {
    if (!window.confirm(`Excluir a aula vazia “${lesson.titulo}”? Progresso ou materiais impedem exclusões inseguras.`)) return;
    try { await mutations.deleteLesson.mutateAsync(lesson); }
    catch (error: unknown) { notifyError("Exclusão bloqueada", error); }
  };

  const selectedMedia = assetsLesson ? media.find((item) => item.lesson_id === assetsLesson.id) ?? null : null;
  const selectedAssets = assetsLesson ? assets.filter((item) => item.lesson_id === assetsLesson.id) : [];

  const externalMedia = async (provider: "youtube" | "vimeo", sourceUrl: string, watermarkEnabled: boolean) => {
    if (!assetsLesson) return;
    try { await mutations.upsertExternalMedia.mutateAsync({ lessonId: assetsLesson.id, provider, sourceUrl, watermarkEnabled }); toast({ title: "Vídeo associado" }); }
    catch (error: unknown) { notifyError("Não foi possível associar o vídeo", error); }
  };

  const privateVideo = async (file: File, watermarkEnabled: boolean) => {
    if (!assetsLesson) return;
    try {
      const asset = await assetUpload.upload({ file, lessonId: assetsLesson.id, purpose: "video" });
      await mutations.upsertPrivateMedia.mutateAsync({ lessonId: assetsLesson.id, assetId: asset.id, watermarkEnabled });
      toast({ title: "Vídeo privado publicado" });
    } catch (error: unknown) { notifyError("Upload de vídeo não concluído", error); }
  };

  const audio = async (file: File) => {
    if (!assetsLesson) return;
    try {
      const asset = await assetUpload.upload({ file, lessonId: assetsLesson.id, purpose: "audio" });
      await mutations.associateAudio.mutateAsync({ lesson: assetsLesson, assetId: asset.id });
      setAssetsLesson((current) => current ? { ...current, audio_asset_id: asset.id, version: current.version + 1 } : current);
      toast({ title: "Áudio associado" });
    } catch (error: unknown) { notifyError("Upload de áudio não concluído", error); }
  };

  const material = async (file: File, purpose: LessonUploadPurpose) => {
    if (!assetsLesson) return;
    try { await assetUpload.upload({ file, lessonId: assetsLesson.id, purpose }); await curriculumQuery.refetch(); toast({ title: "Material publicado" }); }
    catch (error: unknown) { notifyError("Upload do material não concluído", error); }
  };

  const disableMedia = async () => {
    if (!assetsLesson) return;
    try { await mutations.disableMedia.mutateAsync(assetsLesson.id); toast({ title: "Mídia desativada" }); }
    catch (error: unknown) { notifyError("Não foi possível desativar a mídia", error); }
  };

  const archiveMaterial = async (asset: AssetRow) => {
    if (!assetsLesson) return;
    try { await mutations.archiveMaterial.mutateAsync({ assetId: asset.id, lessonId: assetsLesson.id }); toast({ title: "Material arquivado" }); }
    catch (error: unknown) { notifyError("Não foi possível arquivar o material", error); }
  };

  if (!courseId) return <div className="min-h-screen bg-black text-white grid place-items-center">Curso não informado.</div>;
  if (courseQuery.isLoading || curriculumQuery.isLoading) return <div className="min-h-screen bg-black text-white grid place-items-center">Carregando currículo persistido...</div>;
  if (courseQuery.error || curriculumQuery.error) return <div className="min-h-screen bg-black text-white grid place-items-center">{getErrorMessage(courseQuery.error ?? curriculumQuery.error)}</div>;
  if (!courseQuery.data) return <div className="min-h-screen bg-black text-white grid place-items-center">Curso não encontrado.</div>;

  return (
    <AdminCourseLayout
      title={`Currículo · ${courseQuery.data.title}`}
      description="Módulos, aulas, dependências, disponibilidade e mídia são operados exclusivamente por RPCs auditadas e versões otimistas."
      actions={<><Button variant="outline" onClick={() => navigate(`/admin/cursos/${courseId}/editar`)}><ArrowLeft className="mr-2 h-4 w-4" /> Curso</Button><Button variant="outline" onClick={() => navigate(`/admin/cursos/${courseId}/preview`)}><Eye className="mr-2 h-4 w-4" /> Preview</Button><Button variant="outline" disabled={busy} onClick={() => curriculumQuery.refetch()}><RefreshCw className="mr-2 h-4 w-4" /> Atualizar</Button><Button disabled={busy} onClick={() => setModuleDialog({ open: true, module: null })}><Plus className="mr-2 h-4 w-4" /> Novo módulo</Button></>}
    >
      <div className="space-y-6">
        {modules.length === 0 ? <div className="rounded-xl border border-dashed border-white/15 p-12 text-center text-gray-400">Crie o primeiro módulo para iniciar o currículo.</div> : modules.map((module, index) => <CurriculumModuleCard
          key={module.id}
          module={module}
          lessons={lessonsByModule.get(module.id) ?? []}
          moduleIndex={index}
          moduleCount={modules.length}
          busy={busy}
          onMoveModule={moveModule}
          onEditModule={(item) => setModuleDialog({ open: true, module: item })}
          onDuplicateModule={duplicateModule}
          onArchiveModule={archiveModule}
          onDeleteModule={deleteModule}
          onCreateLesson={(item) => setLessonDialog({ open: true, module: item, lesson: null })}
          onMoveLesson={moveLesson}
          onMoveLessonToModule={moveLessonToModule}
          onEditLesson={(item, lesson) => setLessonDialog({ open: true, module: item, lesson })}
          onDuplicateLesson={duplicateLesson}
          onArchiveLesson={archiveLesson}
          onDeleteLesson={deleteLesson}
          onAssets={setAssetsLesson}
        />)}
      </div>

      <ModuleEditorDialog open={moduleDialog.open} module={moduleDialog.module} modules={modules} prerequisiteIds={moduleDialog.module ? modulePrerequisites.filter((item) => item.module_id === moduleDialog.module?.id).map((item) => item.prerequisite_module_id) : []} busy={busy} onOpenChange={(open) => setModuleDialog((current) => ({ ...current, open }))} onSubmit={submitModule} />
      <LessonEditorDialog open={lessonDialog.open} lesson={lessonDialog.lesson} module={lessonDialog.module} modules={modules} lessons={lessons} prerequisiteIds={lessonDialog.lesson ? lessonPrerequisites.filter((item) => item.lesson_id === lessonDialog.lesson?.id).map((item) => item.prerequisite_lesson_id) : []} busy={busy} onOpenChange={(open) => setLessonDialog((current) => ({ ...current, open }))} onSubmit={submitLesson} />
      <LessonAssetsDialog open={Boolean(assetsLesson)} lesson={assetsLesson} media={selectedMedia} assets={selectedAssets} busy={busy} onOpenChange={(open) => { if (!open) setAssetsLesson(null); }} onExternalMedia={externalMedia} onPrivateVideo={privateVideo} onAudio={audio} onMaterial={material} onDisableMedia={disableMedia} onArchiveMaterial={archiveMaterial} />
    </AdminCourseLayout>
  );
};

export default CourseCurriculum;

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { parseDataContract } from "@/contracts/contract-error";
import { courseCmsRowSchema, type CourseCmsRow } from "@/contracts/course-cms";
import {
  curriculumLessonRowSchema,
  curriculumLessonRowsSchema,
  curriculumModuleRowSchema,
  curriculumModuleRowsSchema,
  lessonFormToPayload,
  lessonMediaRowSchema,
  lessonMediaRowsSchema,
  lessonPrerequisiteRowsSchema,
  moduleFormToPayload,
  modulePrerequisiteRowsSchema,
  type CurriculumLessonRow,
  type CurriculumModuleRow,
  type LessonFormValues,
  type LessonMediaRow,
  type LessonPrerequisiteRow,
  type ModuleFormValues,
  type ModulePrerequisiteRow,
} from "@/contracts/curriculum-cms";
import { assetRowSchema, assetRowsSchema, type AssetRow } from "@/contracts/storage";
import { supabase } from "@/integrations/supabase/client";

export interface CurriculumSnapshot {
  readonly modules: CurriculumModuleRow[];
  readonly lessons: CurriculumLessonRow[];
  readonly modulePrerequisites: ModulePrerequisiteRow[];
  readonly lessonPrerequisites: LessonPrerequisiteRow[];
  readonly media: LessonMediaRow[];
  readonly assets: AssetRow[];
}

const curriculumKey = (courseId: string) => ["admin", "curriculum", courseId] as const;
const courseKey = (courseId: string) => ["admin", "courses", courseId] as const;
const coursesKey = ["admin", "courses"] as const;

export const useAdminCurriculum = (courseId: string | undefined) => useQuery({
  queryKey: curriculumKey(courseId ?? "missing"),
  enabled: Boolean(courseId),
  queryFn: async (): Promise<CurriculumSnapshot> => {
    if (!courseId) throw new Error("Curso não informado.");

    const modulesResult = await supabase
      .from("modulos")
      .select("*")
      .eq("course_id", courseId)
      .is("deleted_at", null)
      .order("ordem", { ascending: true });
    if (modulesResult.error) throw modulesResult.error;
    const modules = parseDataContract(curriculumModuleRowsSchema, modulesResult.data, "módulos administrativos");
    const moduleIds = modules.map((module) => module.id);

    let lessons: CurriculumLessonRow[] = [];
    let modulePrerequisites: ModulePrerequisiteRow[] = [];
    if (moduleIds.length > 0) {
      const lessonsResult = await supabase
        .from("aulas")
        .select("*")
        .in("modulo_id", moduleIds)
        .is("deleted_at", null)
        .order("ordem", { ascending: true });
      if (lessonsResult.error) throw lessonsResult.error;
      lessons = parseDataContract(curriculumLessonRowsSchema, lessonsResult.data, "aulas administrativas");

      const modulePrerequisitesResult = await supabase
        .from("module_prerequisites")
        .select("*")
        .in("module_id", moduleIds);
      if (modulePrerequisitesResult.error) throw modulePrerequisitesResult.error;
      modulePrerequisites = parseDataContract(
        modulePrerequisiteRowsSchema,
        modulePrerequisitesResult.data,
        "pré-requisitos dos módulos",
      );
    }

    const lessonIds = lessons.map((lesson) => lesson.id);
    let lessonPrerequisites: LessonPrerequisiteRow[] = [];
    let media: LessonMediaRow[] = [];
    let assets: AssetRow[] = [];
    if (lessonIds.length > 0) {
      const lessonPrerequisitesResult = await supabase
        .from("lesson_prerequisites")
        .select("*")
        .in("lesson_id", lessonIds);
      if (lessonPrerequisitesResult.error) throw lessonPrerequisitesResult.error;
      lessonPrerequisites = parseDataContract(
        lessonPrerequisiteRowsSchema,
        lessonPrerequisitesResult.data,
        "pré-requisitos das aulas",
      );

      const mediaResult = await supabase
        .from("lesson_media")
        .select("*")
        .in("lesson_id", lessonIds)
        .eq("is_active", true);
      if (mediaResult.error) throw mediaResult.error;
      media = parseDataContract(lessonMediaRowsSchema, mediaResult.data, "mídia ativa das aulas");

      const assetsResult = await supabase
        .from("assets")
        .select("*")
        .in("lesson_id", lessonIds)
        .eq("state", "published")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (assetsResult.error) throw assetsResult.error;
      assets = parseDataContract(assetRowsSchema, assetsResult.data, "assets publicados das aulas");
    }

    return { modules, lessons, modulePrerequisites, lessonPrerequisites, media, assets };
  },
});

export const useCurriculumCmsMutations = (courseId: string) => {
  const queryClient = useQueryClient();
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: curriculumKey(courseId) });
    await queryClient.invalidateQueries({ queryKey: courseKey(courseId) });
    await queryClient.invalidateQueries({ queryKey: coursesKey });
  };

  const createModule = useMutation({
    mutationFn: async (values: ModuleFormValues): Promise<CurriculumModuleRow> => {
      const parsed = moduleFormToPayload(values);
      const { data, error } = await supabase.rpc("create_module", { p_course_id: courseId, p_payload: parsed });
      if (error) throw error;
      return parseDataContract(curriculumModuleRowSchema, data, "criação do módulo");
    },
    onSuccess: refresh,
  });

  const updateModule = useMutation({
    mutationFn: async ({ module, values }: { module: CurriculumModuleRow; values: ModuleFormValues }): Promise<CurriculumModuleRow> => {
      const { data, error } = await supabase.rpc("update_module", {
        p_module_id: module.id,
        p_expected_version: module.version,
        p_payload: moduleFormToPayload(values),
      });
      if (error) throw error;
      return parseDataContract(curriculumModuleRowSchema, data, "edição do módulo");
    },
    onSuccess: refresh,
  });

  const setModulePrerequisites = useMutation({
    mutationFn: async ({ module, prerequisiteIds }: { module: CurriculumModuleRow; prerequisiteIds: string[] }): Promise<CurriculumModuleRow> => {
      const { data, error } = await supabase.rpc("set_module_prerequisites", {
        p_module_id: module.id,
        p_expected_version: module.version,
        p_prerequisite_ids: prerequisiteIds,
      });
      if (error) throw error;
      return parseDataContract(curriculumModuleRowSchema, data, "pré-requisitos do módulo");
    },
    onSuccess: refresh,
  });

  const duplicateModule = useMutation({
    mutationFn: async ({ moduleId, title }: { moduleId: string; title: string }): Promise<CurriculumModuleRow> => {
      const { data, error } = await supabase.rpc("duplicate_module", { p_module_id: moduleId, p_title: title });
      if (error) throw error;
      return parseDataContract(curriculumModuleRowSchema, data, "duplicação do módulo");
    },
    onSuccess: refresh,
  });

  const archiveModule = useMutation({
    mutationFn: async (module: CurriculumModuleRow): Promise<CurriculumModuleRow> => {
      const { data, error } = await supabase.rpc("archive_module", {
        p_module_id: module.id,
        p_expected_version: module.version,
      });
      if (error) throw error;
      return parseDataContract(curriculumModuleRowSchema, data, "arquivamento do módulo");
    },
    onSuccess: refresh,
  });

  const deleteModule = useMutation({
    mutationFn: async (module: CurriculumModuleRow): Promise<boolean> => {
      const { data, error } = await supabase.rpc("delete_module", {
        p_module_id: module.id,
        p_expected_version: module.version,
      });
      if (error) throw error;
      return parseDataContract(z.boolean(), data, "exclusão controlada do módulo");
    },
    onSuccess: refresh,
  });

  const reorderModules = useMutation({
    mutationFn: async ({ course, modules }: { course: CourseCmsRow; modules: CurriculumModuleRow[] }): Promise<CourseCmsRow> => {
      const items = modules.map((module, index) => ({ id: module.id, order: index, version: module.version }));
      const { data, error } = await supabase.rpc("reorder_modules", {
        p_course_id: course.id,
        p_expected_course_version: course.version,
        p_items: items,
      });
      if (error) throw error;
      return parseDataContract(courseCmsRowSchema, data, "reordenação dos módulos");
    },
    onSuccess: refresh,
  });

  const createLesson = useMutation({
    mutationFn: async ({ moduleId, values }: { moduleId: string; values: LessonFormValues }): Promise<CurriculumLessonRow> => {
      const { data, error } = await supabase.rpc("create_lesson", {
        p_module_id: moduleId,
        p_payload: lessonFormToPayload(values),
      });
      if (error) throw error;
      return parseDataContract(curriculumLessonRowSchema, data, "criação da aula");
    },
    onSuccess: refresh,
  });

  const updateLesson = useMutation({
    mutationFn: async ({ lesson, values }: { lesson: CurriculumLessonRow; values: LessonFormValues }): Promise<CurriculumLessonRow> => {
      const { data, error } = await supabase.rpc("update_lesson", {
        p_lesson_id: lesson.id,
        p_expected_version: lesson.version,
        p_payload: lessonFormToPayload(values),
      });
      if (error) throw error;
      return parseDataContract(curriculumLessonRowSchema, data, "edição da aula");
    },
    onSuccess: refresh,
  });

  const setLessonPrerequisites = useMutation({
    mutationFn: async ({ lesson, prerequisiteIds }: { lesson: CurriculumLessonRow; prerequisiteIds: string[] }): Promise<CurriculumLessonRow> => {
      const { data, error } = await supabase.rpc("set_lesson_prerequisites", {
        p_lesson_id: lesson.id,
        p_expected_version: lesson.version,
        p_prerequisite_ids: prerequisiteIds,
      });
      if (error) throw error;
      return parseDataContract(curriculumLessonRowSchema, data, "pré-requisitos da aula");
    },
    onSuccess: refresh,
  });

  const duplicateLesson = useMutation({
    mutationFn: async ({ lessonId, title }: { lessonId: string; title: string }): Promise<CurriculumLessonRow> => {
      const { data, error } = await supabase.rpc("duplicate_lesson", { p_lesson_id: lessonId, p_title: title });
      if (error) throw error;
      return parseDataContract(curriculumLessonRowSchema, data, "duplicação da aula");
    },
    onSuccess: refresh,
  });

  const archiveLesson = useMutation({
    mutationFn: async (lesson: CurriculumLessonRow): Promise<CurriculumLessonRow> => {
      const { data, error } = await supabase.rpc("archive_lesson", {
        p_lesson_id: lesson.id,
        p_expected_version: lesson.version,
      });
      if (error) throw error;
      return parseDataContract(curriculumLessonRowSchema, data, "arquivamento da aula");
    },
    onSuccess: refresh,
  });

  const deleteLesson = useMutation({
    mutationFn: async (lesson: CurriculumLessonRow): Promise<boolean> => {
      const { data, error } = await supabase.rpc("delete_lesson", {
        p_lesson_id: lesson.id,
        p_expected_version: lesson.version,
      });
      if (error) throw error;
      return parseDataContract(z.boolean(), data, "exclusão controlada da aula");
    },
    onSuccess: refresh,
  });

  const reorderLessons = useMutation({
    mutationFn: async ({ module, lessons }: { module: CurriculumModuleRow; lessons: CurriculumLessonRow[] }): Promise<CurriculumModuleRow> => {
      const items = lessons.map((lesson, index) => ({ id: lesson.id, order: index, version: lesson.version }));
      const { data, error } = await supabase.rpc("reorder_lessons", {
        p_module_id: module.id,
        p_expected_module_version: module.version,
        p_items: items,
      });
      if (error) throw error;
      return parseDataContract(curriculumModuleRowSchema, data, "reordenação das aulas");
    },
    onSuccess: refresh,
  });

  const moveLesson = useMutation({
    mutationFn: async ({ lesson, sourceModule, targetModule }: {
      lesson: CurriculumLessonRow;
      sourceModule: CurriculumModuleRow;
      targetModule: CurriculumModuleRow;
    }): Promise<CurriculumLessonRow> => {
      const { data, error } = await supabase.rpc("move_lesson", {
        p_lesson_id: lesson.id,
        p_expected_lesson_version: lesson.version,
        p_target_module_id: targetModule.id,
        p_expected_source_module_version: sourceModule.version,
        p_expected_target_module_version: targetModule.version,
      });
      if (error) throw error;
      return parseDataContract(curriculumLessonRowSchema, data, "movimentação da aula");
    },
    onSuccess: refresh,
  });

  const associateAudio = useMutation({
    mutationFn: async ({ lesson, assetId }: { lesson: CurriculumLessonRow; assetId: string | null }): Promise<CurriculumLessonRow> => {
      const { data, error } = await supabase.rpc("update_lesson", {
        p_lesson_id: lesson.id,
        p_expected_version: lesson.version,
        p_payload: { audio_asset_id: assetId },
      });
      if (error) throw error;
      return parseDataContract(curriculumLessonRowSchema, data, "associação do áudio");
    },
    onSuccess: refresh,
  });

  const upsertExternalMedia = useMutation({
    mutationFn: async ({ lessonId, provider, sourceUrl, watermarkEnabled }: {
      lessonId: string;
      provider: "youtube" | "vimeo";
      sourceUrl: string;
      watermarkEnabled: boolean;
    }): Promise<LessonMediaRow> => {
      const { data, error } = await supabase.rpc("upsert_external_lesson_media", {
        p_lesson_id: lessonId,
        p_provider: provider,
        p_source_url: sourceUrl,
        p_watermark_enabled: watermarkEnabled,
      });
      if (error) throw error;
      return parseDataContract(lessonMediaRowSchema, data, "mídia externa da aula");
    },
    onSuccess: refresh,
  });

  const upsertPrivateMedia = useMutation({
    mutationFn: async ({ lessonId, assetId, watermarkEnabled }: {
      lessonId: string;
      assetId: string;
      watermarkEnabled: boolean;
    }): Promise<LessonMediaRow> => {
      const { data, error } = await supabase.rpc("upsert_private_lesson_media", {
        p_lesson_id: lessonId,
        p_asset_id: assetId,
        p_watermark_enabled: watermarkEnabled,
      });
      if (error) throw error;
      return parseDataContract(lessonMediaRowSchema, data, "mídia privada da aula");
    },
    onSuccess: refresh,
  });

  const disableMedia = useMutation({
    mutationFn: async (lessonId: string): Promise<boolean> => {
      const { data, error } = await supabase.rpc("disable_lesson_media", { p_lesson_id: lessonId });
      if (error) throw error;
      return parseDataContract(z.boolean(), data, "desativação da mídia da aula");
    },
    onSuccess: refresh,
  });

  const archiveMaterial = useMutation({
    mutationFn: async ({ assetId, lessonId }: { assetId: string; lessonId: string }): Promise<AssetRow> => {
      const { data, error } = await supabase.rpc("archive_lesson_material", {
        p_asset_id: assetId,
        p_lesson_id: lessonId,
      });
      if (error) throw error;
      return parseDataContract(assetRowSchema, data, "arquivamento do material da aula");
    },
    onSuccess: refresh,
  });

  return {
    createModule,
    updateModule,
    setModulePrerequisites,
    duplicateModule,
    archiveModule,
    deleteModule,
    reorderModules,
    createLesson,
    updateLesson,
    setLessonPrerequisites,
    duplicateLesson,
    archiveLesson,
    deleteLesson,
    reorderLessons,
    moveLesson,
    associateAudio,
    upsertExternalMedia,
    upsertPrivateMedia,
    disableMedia,
    archiveMaterial,
  };
};

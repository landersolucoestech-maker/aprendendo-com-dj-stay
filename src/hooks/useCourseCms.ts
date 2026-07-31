import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { parseDataContract } from "@/contracts/contract-error";
import {
  courseCmsRowSchema,
  courseCmsRowsSchema,
  courseFormToPayload,
  type CourseCmsRow,
  type CourseFormValues,
} from "@/contracts/course-cms";
import { supabase } from "@/integrations/supabase/client";

const courseListKey = ["admin", "courses"] as const;
const courseKey = (courseId: string) => ["admin", "courses", courseId] as const;

export const useAdminCourses = () => useQuery({
  queryKey: courseListKey,
  queryFn: async (): Promise<CourseCmsRow[]> => {
    const { data, error } = await supabase.from("courses").select("*").order("updated_at", { ascending: false });
    if (error) throw error;
    return parseDataContract(courseCmsRowsSchema, data, "lista administrativa de cursos");
  },
});

export const useAdminCourse = (courseId: string | undefined) => useQuery({
  queryKey: courseKey(courseId ?? "missing"),
  queryFn: async (): Promise<CourseCmsRow> => {
    if (!courseId) throw new Error("Curso não informado.");
    const { data, error } = await supabase.from("courses").select("*").eq("id", courseId).single();
    if (error) throw error;
    return parseDataContract(courseCmsRowSchema, data, "curso administrativo");
  },
  enabled: Boolean(courseId),
});

export const useCourseCmsMutations = () => {
  const queryClient = useQueryClient();
  const refresh = async (courseId?: string) => {
    await queryClient.invalidateQueries({ queryKey: courseListKey });
    if (courseId) await queryClient.invalidateQueries({ queryKey: courseKey(courseId) });
  };

  const create = useMutation({
    mutationFn: async (values: CourseFormValues): Promise<CourseCmsRow> => {
      const { data, error } = await supabase.rpc("create_course", { p_payload: courseFormToPayload(values) });
      if (error) throw error;
      return parseDataContract(courseCmsRowSchema, data, "criação do curso");
    },
    onSuccess: async (course) => refresh(course.id),
  });

  const update = useMutation({
    mutationFn: async ({ course, values }: { course: CourseCmsRow; values: CourseFormValues }): Promise<CourseCmsRow> => {
      const { data, error } = await supabase.rpc("update_course", {
        p_course_id: course.id,
        p_expected_version: course.version,
        p_patch: courseFormToPayload(values),
      });
      if (error) throw error;
      return parseDataContract(courseCmsRowSchema, data, "edição do curso");
    },
    onSuccess: async (course) => refresh(course.id),
  });

  const duplicate = useMutation({
    mutationFn: async ({ courseId, title, slug }: { courseId: string; title: string; slug: string }): Promise<CourseCmsRow> => {
      const { data, error } = await supabase.rpc("duplicate_course", { p_course_id: courseId, p_title: title, p_slug: slug });
      if (error) throw error;
      return parseDataContract(courseCmsRowSchema, data, "duplicação do curso");
    },
    onSuccess: async (course) => refresh(course.id),
  });

  const mutateStatus = async (rpc: "publish_course" | "unpublish_course" | "archive_course", course: CourseCmsRow): Promise<CourseCmsRow> => {
    const { data, error } = await supabase.rpc(rpc, { p_course_id: course.id, p_expected_version: course.version });
    if (error) throw error;
    return parseDataContract(courseCmsRowSchema, data, `${rpc} do curso`);
  };

  const publish = useMutation({
    mutationFn: (course: CourseCmsRow) => mutateStatus("publish_course", course),
    onSuccess: async (course) => refresh(course.id),
  });
  const unpublish = useMutation({
    mutationFn: (course: CourseCmsRow) => mutateStatus("unpublish_course", course),
    onSuccess: async (course) => refresh(course.id),
  });
  const archive = useMutation({
    mutationFn: (course: CourseCmsRow) => mutateStatus("archive_course", course),
    onSuccess: async (course) => refresh(course.id),
  });

  const remove = useMutation({
    mutationFn: async (course: CourseCmsRow): Promise<CourseCmsRow> => {
      const { data, error } = await supabase.rpc("delete_course", { p_course_id: course.id, p_expected_version: course.version });
      if (error) throw error;
      return parseDataContract(courseCmsRowSchema, data, "exclusão controlada do curso");
    },
    onSuccess: async () => refresh(),
  });

  return {
    create,
    update,
    duplicate,
    publish,
    unpublish,
    archive,
    remove,
  };
};

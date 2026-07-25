import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CourseSummary, db, InstructorMetrics, slugify } from "@/lib/platform";

export function useInstructorMetrics(from?: Date, to?: Date) {
  return useQuery({
    queryKey: ["instructor-dashboard", from?.toISOString(), to?.toISOString()],
    queryFn: async (): Promise<InstructorMetrics> => {
      const { data, error } = await db.rpc("get_instructor_dashboard", {
        target_from: from?.toISOString(),
        target_to: to?.toISOString(),
      });
      if (error) throw error;
      return data as InstructorMetrics;
    },
  });
}

export function useInstructorCourses() {
  return useQuery({
    queryKey: ["instructor-courses"],
    queryFn: async () => {
      const { data, error } = await db
        .from("courses")
        .select("id,title,slug,short_description,cover_image_path,category,level,workload_minutes,status,published_at,updated_at,course_modules(count)")
        .is("deleted_at", null)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as Array<CourseSummary & { updated_at: string; course_modules: Array<{ count: number }> }>;
    },
  });
}

export function useCourseEditor(courseId?: string) {
  return useQuery({
    queryKey: ["course-editor", courseId],
    enabled: Boolean(courseId),
    queryFn: async () => {
      const { data, error } = await db
        .from("courses")
        .select(`
          *,
          course_modules (
            *,
            lessons (
              *,
              lesson_assets (*)
            )
          ),
          products (
            *,
            offers (*)
          )
        `)
        .eq("id", courseId)
        .single();
      if (error) throw error;
      const modules = [...(data.course_modules ?? [])]
        .sort((left, right) => left.sort_order - right.sort_order)
        .map((module) => ({
          ...module,
          lessons: [...(module.lessons ?? [])]
            .sort((left, right) => left.sort_order - right.sort_order)
            .map((lesson) => ({
              ...lesson,
              lesson_assets: [...(lesson.lesson_assets ?? [])].sort((left, right) => left.sort_order - right.sort_order),
            })),
        }));
      return { ...data, course_modules: modules };
    },
  });
}

export function useCreateCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; short_description?: string; category?: string; created_by: string }) => {
      const { data, error } = await db.from("courses").insert({
        title: input.title.trim(),
        slug: `${slugify(input.title)}-${crypto.randomUUID().slice(0, 8)}`,
        short_description: input.short_description?.trim() || null,
        category: input.category?.trim() || null,
        created_by: input.created_by,
        status: "draft",
      }).select("id,slug").single();
      if (error) throw error;

      await db.from("course_instructors").insert({
        course_id: data.id,
        instructor_id: input.created_by,
        is_primary: true,
      });
      return data as { id: string; slug: string };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["instructor-courses"] }),
  });
}

export function useUpdateCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Record<string, unknown> }) => {
      const normalized = { ...values };
      if (typeof values.title === "string" && !values.slug) normalized.slug = slugify(values.title);
      const { data, error } = await db.from("courses").update(normalized).eq("id", id).select("*").single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["instructor-courses"] });
      queryClient.invalidateQueries({ queryKey: ["course-editor", data.id] });
    },
  });
}

export function useCreateModule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ courseId, title, sortOrder }: { courseId: string; title: string; sortOrder: number }) => {
      const { data, error } = await db.from("course_modules").insert({
        course_id: courseId,
        title: title.trim(),
        sort_order: sortOrder,
        is_published: false,
      }).select("*").single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => queryClient.invalidateQueries({ queryKey: ["course-editor", data.course_id] }),
  });
}

export function useUpdateModule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, courseId, values }: { id: string; courseId: string; values: Record<string, unknown> }) => {
      const { error } = await db.from("course_modules").update(values).eq("id", id);
      if (error) throw error;
      return { courseId };
    },
    onSuccess: ({ courseId }) => queryClient.invalidateQueries({ queryKey: ["course-editor", courseId] }),
  });
}

export function useCreateLesson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ courseId, moduleId, title, sortOrder }: { courseId: string; moduleId: string; title: string; sortOrder: number }) => {
      const { data, error } = await db.from("lessons").insert({
        module_id: moduleId,
        title: title.trim(),
        slug: `${slugify(title)}-${crypto.randomUUID().slice(0, 8)}`,
        sort_order: sortOrder,
        content_type: "video",
        is_published: false,
      }).select("*").single();
      if (error) throw error;
      return { data, courseId };
    },
    onSuccess: ({ courseId }) => queryClient.invalidateQueries({ queryKey: ["course-editor", courseId] }),
  });
}

export function useUpdateLesson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, courseId, values }: { id: string; courseId: string; values: Record<string, unknown> }) => {
      const { error } = await db.from("lessons").update(values).eq("id", id);
      if (error) throw error;
      return { courseId };
    },
    onSuccess: ({ courseId }) => queryClient.invalidateQueries({ queryKey: ["course-editor", courseId] }),
  });
}

export function useCreateLessonAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ courseId, lessonId, values }: { courseId: string; lessonId: string; values: Record<string, unknown> }) => {
      const { error } = await db.from("lesson_assets").insert({ lesson_id: lessonId, ...values });
      if (error) throw error;
      return { courseId };
    },
    onSuccess: ({ courseId }) => queryClient.invalidateQueries({ queryKey: ["course-editor", courseId] }),
  });
}

export function useInstructorStudents() {
  return useQuery({
    queryKey: ["instructor-students"],
    queryFn: async () => {
      const { data, error } = await db.from("enrollments").select(`
        id,status,progress_percent,enrolled_at,last_accessed_at,completed_at,
        profiles!enrollments_user_id_fkey(id,full_name,phone,avatar_url),
        courses(id,title)
      `).order("enrolled_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useInstructorSales() {
  return useQuery({
    queryKey: ["instructor-sales"],
    queryFn: async () => {
      const { data, error } = await db.from("order_items").select(`
        id,course_id,course_title,product_name,offer_name,total_amount_cents,created_at,
        orders!inner(id,order_number,status,user_id,customer_snapshot,created_at,paid_at),
        payments(id,status,payment_method,provider,amount_cents,approved_at)
      `).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

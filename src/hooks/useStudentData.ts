import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { db, EnrollmentSummary } from "@/lib/platform";

export function useMyEnrollments() {
  return useQuery({
    queryKey: ["my-enrollments"],
    queryFn: async (): Promise<EnrollmentSummary[]> => {
      const { data, error } = await db.from("enrollments").select(`
        id,course_id,status,progress_percent,enrolled_at,last_accessed_at,
        courses(id,title,slug,short_description,cover_image_path,category,level,workload_minutes,status,published_at)
      `).in("status", ["active", "completed"]).order("last_accessed_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as EnrollmentSummary[];
    },
  });
}

export function useCourseLearning(courseId?: string) {
  return useQuery({
    queryKey: ["course-learning", courseId],
    enabled: Boolean(courseId),
    queryFn: async () => {
      const [{ data: course, error: courseError }, { data: enrollment, error: enrollmentError }] = await Promise.all([
        db.from("courses").select(`
          id,title,slug,description,short_description,cover_image_path,workload_minutes,
          course_modules(id,title,description,sort_order,release_after_days,lessons(id,title,slug,description,content_type,duration_seconds,sort_order,is_preview,is_required))
        `).eq("id", courseId).single(),
        db.from("enrollments").select("id,status,progress_percent,enrolled_at,last_accessed_at").eq("course_id", courseId).single(),
      ]);
      if (courseError) throw courseError;
      if (enrollmentError) throw enrollmentError;

      const { data: progress, error: progressError } = await db.from("lesson_progress")
        .select("lesson_id,progress_percent,completed,last_position_seconds,last_viewed_at")
        .eq("enrollment_id", enrollment.id);
      if (progressError) throw progressError;
      const progressByLesson = new Map((progress ?? []).map((item) => [item.lesson_id, item]));
      const modules = [...(course.course_modules ?? [])].sort((a, b) => a.sort_order - b.sort_order).map((module) => ({
        ...module,
        lessons: [...(module.lessons ?? [])].sort((a, b) => a.sort_order - b.sort_order).map((lesson) => ({
          ...lesson,
          progress: progressByLesson.get(lesson.id) ?? null,
        })),
      }));
      return { course: { ...course, course_modules: modules }, enrollment };
    },
  });
}

export function useLessonDetail(lessonId?: string) {
  return useQuery({
    queryKey: ["lesson-detail", lessonId],
    enabled: Boolean(lessonId),
    queryFn: async () => {
      const { data: lesson, error } = await db.from("lessons").select(`
        id,title,slug,description,content,content_type,video_url,video_storage_path,audio_storage_path,duration_seconds,sort_order,completion_threshold_percent,
        course_modules!inner(id,title,course_id,courses!inner(id,title,slug)),
        lesson_assets(id,title,description,asset_type,storage_path,external_url,mime_type,file_size_bytes,sort_order,is_downloadable)
      `).eq("id", lessonId).single();
      if (error) throw error;

      const { data: progress } = await db.from("lesson_progress")
        .select("progress_percent,completed,last_position_seconds,watched_seconds")
        .eq("lesson_id", lessonId).maybeSingle();

      let mediaUrl = lesson.video_url || null;
      if (!mediaUrl && lesson.video_storage_path) {
        const { data, error: signedError } = await supabase.storage.from("course-videos").createSignedUrl(lesson.video_storage_path, 3600);
        if (signedError) throw signedError;
        mediaUrl = data.signedUrl;
      }
      if (!mediaUrl && lesson.audio_storage_path) {
        const { data, error: signedError } = await supabase.storage.from("course-videos").createSignedUrl(lesson.audio_storage_path, 3600);
        if (signedError) throw signedError;
        mediaUrl = data.signedUrl;
      }

      const assets = await Promise.all((lesson.lesson_assets ?? []).sort((a, b) => a.sort_order - b.sort_order).map(async (asset) => {
        if (!asset.storage_path) return { ...asset, download_url: asset.external_url };
        const { data, error: signedError } = await supabase.storage.from("course-assets").createSignedUrl(asset.storage_path, 900, {
          download: asset.is_downloadable ? asset.title : false,
        });
        if (signedError) return { ...asset, download_url: null };
        return { ...asset, download_url: data.signedUrl };
      }));

      return { ...lesson, media_url: mediaUrl, lesson_assets: assets, progress: progress ?? null };
    },
  });
}

export function useUpdateLessonProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ lessonId, progressPercent, watchedSeconds = 0, lastPositionSeconds = 0 }: {
      lessonId: string;
      progressPercent: number;
      watchedSeconds?: number;
      lastPositionSeconds?: number;
    }) => {
      const { data, error } = await db.rpc("upsert_lesson_progress", {
        target_lesson_id: lessonId,
        target_progress_percent: progressPercent,
        target_watched_seconds: watchedSeconds,
        target_last_position_seconds: lastPositionSeconds,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["lesson-detail", variables.lessonId] });
      queryClient.invalidateQueries({ queryKey: ["my-enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["course-learning"] });
    },
  });
}

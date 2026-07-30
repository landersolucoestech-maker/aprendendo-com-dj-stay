import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/auth/use-auth";
import { parseDataContract } from "@/contracts/contract-error";
import {
  enrollmentsWithCourseSchema,
  type EnrollmentWithCourse,
} from "@/contracts/course-access";
import { supabase } from "@/integrations/supabase/client";

const isCurrentlyActive = (enrollment: EnrollmentWithCourse): boolean => {
  const now = Date.now();
  const startsAt = Date.parse(enrollment.starts_at);
  const expiresAt = enrollment.expires_at === null ? null : Date.parse(enrollment.expires_at);

  return (
    enrollment.status === "active" &&
    enrollment.courses.status === "published" &&
    startsAt <= now &&
    (expiresAt === null || expiresAt > now)
  );
};

export const useCourseAccess = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["course-access", user?.id ?? null],
    queryFn: async (): Promise<EnrollmentWithCourse[]> => {
      if (!user) {
        throw new Error("Usuário não autenticado.");
      }

      const { data, error } = await supabase
        .from("enrollments")
        .select(
          "id,user_id,course_id,status,source,source_reference,payment_confirmed_at,starts_at,expires_at,status_reason,courses(id,title,slug,status)",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      return parseDataContract(
        enrollmentsWithCourseSchema,
        data,
        "matrículas do usuário autenticado",
      );
    },
    enabled: user !== null,
    staleTime: 30_000,
  });
};

export const getActiveEnrollments = (enrollments: EnrollmentWithCourse[]): EnrollmentWithCourse[] =>
  enrollments.filter(isCurrentlyActive);

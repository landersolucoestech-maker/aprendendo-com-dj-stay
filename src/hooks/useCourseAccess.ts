import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/auth/use-auth";
import { parseDataContract } from "@/contracts/contract-error";
import {
  enrollmentsWithCourseSchema,
  type EnrollmentWithCourse,
} from "@/contracts/course-access";
import { supabase } from "@/integrations/supabase/client";

export { getActiveEnrollments } from "@/contracts/course-access";

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

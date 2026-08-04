import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/auth/use-auth";
import { parseDataContract } from "@/contracts/contract-error";
import { uuidSchema } from "@/contracts/learning";
import {
  studentCourseDetailAccessSchema,
  type StudentCourseDetailAccess,
} from "@/contracts/student-course-detail-access";
import { supabase } from "@/integrations/supabase/client";

export const useStudentCourseDetailAccess = (courseId: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: [
      "student-course-detail-access",
      user?.id ?? null,
      courseId ?? null,
    ],
    queryFn: async (): Promise<StudentCourseDetailAccess> => {
      if (!user) {
        throw new Error("Usuário não autenticado.");
      }

      const normalizedCourseId = parseDataContract(
        uuidSchema,
        courseId,
        "identificador do curso",
      );
      const { data, error } = await supabase.rpc(
        "get_student_course_detail_access",
        { p_course_id: normalizedCourseId },
      );

      if (error) {
        throw error;
      }

      return parseDataContract(
        studentCourseDetailAccessSchema,
        data,
        "acesso direcionado ao curso do aluno",
      );
    },
    enabled: user !== null && courseId !== undefined,
    staleTime: 30_000,
  });
};

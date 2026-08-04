import { useQuery } from "@tanstack/react-query";

import { parseDataContract } from "@/contracts/contract-error";
import { studentCourseAccessSchema } from "@/contracts/student-course-access";
import { supabase } from "@/integrations/supabase/client";

const normalizePage = (value: number): number => Math.max(0, Math.trunc(value));
const normalizePageSize = (value: number): number =>
  Math.min(100, Math.max(1, Math.trunc(value)));
const normalizeActiveLimit = (value: number): number =>
  Math.min(10, Math.max(1, Math.trunc(value)));

export const useStudentCourseAccess = (
  page = 0,
  pageSize = 20,
  activeLimit = 3,
) => {
  const normalizedPage = normalizePage(page);
  const normalizedPageSize = normalizePageSize(pageSize);
  const normalizedActiveLimit = normalizeActiveLimit(activeLimit);

  return useQuery({
    queryKey: [
      "student-course-access",
      normalizedPage,
      normalizedPageSize,
      normalizedActiveLimit,
    ],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_student_course_access", {
        p_limit: normalizedPageSize,
        p_offset: normalizedPage * normalizedPageSize,
        p_active_limit: normalizedActiveLimit,
      });

      if (error) throw error;

      return parseDataContract(
        studentCourseAccessSchema,
        data,
        "acesso paginado aos cursos do aluno",
      );
    },
    placeholderData: (previousData) => previousData,
    staleTime: 30_000,
  });
};

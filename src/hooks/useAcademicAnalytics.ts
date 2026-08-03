import { useQuery } from "@tanstack/react-query";

import { academicAdminAnalyticsSchema } from "@/contracts/academic-analytics";
import { parseDataContract } from "@/contracts/contract-error";
import { academicAnalyticsRpcClient } from "@/integrations/supabase/academic-analytics-rpc";

export type AcademicAnalyticsQuery = {
  readonly startAt: string;
  readonly endAt: string;
  readonly courseId?: string | null;
  readonly inactiveDays?: number;
};

export const useAcademicAdminAnalytics = ({
  startAt,
  endAt,
  courseId = null,
  inactiveDays = 30,
}: AcademicAnalyticsQuery) =>
  useQuery({
    queryKey: [
      "academic-admin-analytics",
      startAt,
      endAt,
      courseId,
      inactiveDays,
    ],
    queryFn: async () => {
      const { data, error } = await academicAnalyticsRpcClient.rpc(
        "get_academic_admin_analytics",
        {
          p_start_at: startAt,
          p_end_at: endAt,
          p_course_id: courseId,
          p_inactive_days: inactiveDays,
        },
      );
      if (error) throw error;
      return parseDataContract(
        academicAdminAnalyticsSchema,
        data,
        "analytics acadêmico administrativo",
      );
    },
  });

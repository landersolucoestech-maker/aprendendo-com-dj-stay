import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  studentCommunicationPreferencesSchema,
  updateStudentCommunicationPreferencesSchema,
  type UpdateStudentCommunicationPreferences,
} from "@/contracts/student-communication-preferences";
import { studentCommunicationPreferencesRpcClient } from "@/integrations/supabase/student-communication-preferences-rpc";

const queryKey = ["student-communication-preferences"] as const;

export const useStudentCommunicationPreferences = () =>
  useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await studentCommunicationPreferencesRpcClient.rpc(
        "get_my_student_communication_preferences",
      );
      if (error) throw error;
      return studentCommunicationPreferencesSchema.parse(data);
    },
  });

export const useUpdateStudentCommunicationPreferences = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateStudentCommunicationPreferences) => {
      const parsed = updateStudentCommunicationPreferencesSchema.parse(input);
      const { data, error } = await studentCommunicationPreferencesRpcClient.rpc(
        "update_my_student_communication_preferences",
        {
          p_email_transactional: parsed.email_transactional,
          p_email_product_updates: parsed.email_product_updates,
          p_email_marketing: parsed.email_marketing,
          p_privacy_analytics: parsed.privacy_analytics,
          p_consent_version: parsed.consent_version,
        },
      );
      if (error) throw error;
      return studentCommunicationPreferencesSchema.parse(data);
    },
    onSuccess: (preferences) => {
      queryClient.setQueryData(queryKey, preferences);
    },
  });
};

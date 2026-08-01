import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  studentNotificationListSchema,
  studentNotificationReadResultSchema,
  studentNotificationsReadAllResultSchema,
} from "@/contracts/student-notifications";
import { studentNotificationRpcClient } from "@/integrations/supabase/student-notification-rpc";

const notificationKeys = {
  all: ["student-notifications"] as const,
  list: (limit: number, offset: number) =>
    [...notificationKeys.all, "list", limit, offset] as const,
};

export const useStudentNotifications = (limit = 30, offset = 0) =>
  useQuery({
    queryKey: notificationKeys.list(limit, offset),
    queryFn: async () => {
      const { data, error } = await studentNotificationRpcClient.rpc(
        "get_my_student_notifications",
        { p_limit: limit, p_offset: offset },
      );
      if (error) throw error;
      return studentNotificationListSchema.parse(data);
    },
  });

export const useMarkStudentNotificationRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { data, error } = await studentNotificationRpcClient.rpc(
        "mark_my_student_notification_read",
        { p_notification_id: notificationId },
      );
      if (error) throw error;
      return studentNotificationReadResultSchema.parse(data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
};

export const useMarkAllStudentNotificationsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await studentNotificationRpcClient.rpc(
        "mark_all_my_student_notifications_read",
      );
      if (error) throw error;
      return studentNotificationsReadAllResultSchema.parse(data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
};

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  studentFavoriteListSchema,
  studentFavoriteStatusSchema,
  studentFavoriteToggleResultSchema,
  type StudentFavoriteSubjectType,
} from "@/contracts/student-favorites";
import { studentFavoriteRpcClient } from "@/integrations/supabase/student-favorite-rpc";

const favoriteKeys = {
  all: ["student-favorites"] as const,
  list: (limit: number, offset: number) =>
    [...favoriteKeys.all, "list", limit, offset] as const,
  status: (subjectType: StudentFavoriteSubjectType, subjectId: string) =>
    [...favoriteKeys.all, "status", subjectType, subjectId] as const,
};

export const useStudentFavorites = (limit = 30, offset = 0) =>
  useQuery({
    queryKey: favoriteKeys.list(limit, offset),
    queryFn: async () => {
      const { data, error } = await studentFavoriteRpcClient.rpc(
        "get_my_student_favorites",
        { p_limit: limit, p_offset: offset },
      );
      if (error) throw error;
      return studentFavoriteListSchema.parse(data);
    },
  });

export const useStudentFavoriteStatus = (
  subjectType: StudentFavoriteSubjectType,
  subjectId: string,
) =>
  useQuery({
    queryKey: favoriteKeys.status(subjectType, subjectId),
    queryFn: async () => {
      const { data, error } = await studentFavoriteRpcClient.rpc(
        "is_my_student_favorite",
        { p_subject_type: subjectType, p_subject_id: subjectId },
      );
      if (error) throw error;
      return studentFavoriteStatusSchema.parse(data);
    },
    enabled: Boolean(subjectId),
  });

export const useToggleStudentFavorite = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      subjectType,
      subjectId,
    }: {
      subjectType: StudentFavoriteSubjectType;
      subjectId: string;
    }) => {
      const { data, error } = await studentFavoriteRpcClient.rpc(
        "toggle_my_student_favorite",
        { p_subject_type: subjectType, p_subject_id: subjectId },
      );
      if (error) throw error;
      return studentFavoriteToggleResultSchema.parse(data);
    },
    onSuccess: async (result) => {
      queryClient.setQueryData(
        favoriteKeys.status(result.subject_type, result.subject_id),
        result.is_favorite,
      );
      await queryClient.invalidateQueries({ queryKey: favoriteKeys.all });
    },
  });
};

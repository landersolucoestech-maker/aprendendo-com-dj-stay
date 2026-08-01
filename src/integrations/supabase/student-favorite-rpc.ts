import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

import type { StudentFavoriteSubjectType } from "@/contracts/student-favorites";

type JsonRpcResponse = PromiseLike<{ data: Json | null; error: unknown | null }>;
type BooleanRpcResponse = PromiseLike<{ data: boolean | null; error: unknown | null }>;

type StudentFavoriteRpcClient = {
  rpc: {
    (
      functionName: "get_my_student_favorites",
      args?: { p_limit?: number; p_offset?: number },
    ): JsonRpcResponse;
    (
      functionName: "toggle_my_student_favorite",
      args: {
        p_subject_type: StudentFavoriteSubjectType;
        p_subject_id: string;
      },
    ): JsonRpcResponse;
    (
      functionName: "is_my_student_favorite",
      args: {
        p_subject_type: StudentFavoriteSubjectType;
        p_subject_id: string;
      },
    ): BooleanRpcResponse;
  };
};

export const studentFavoriteRpcClient =
  supabase as unknown as StudentFavoriteRpcClient;

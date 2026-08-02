import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

type RpcResponse = PromiseLike<{ data: Json | null; error: unknown | null }>;

type StudentCommunicationPreferencesRpcClient = {
  rpc: (
    functionName:
      | "get_my_student_communication_preferences"
      | "update_my_student_communication_preferences",
    args?: {
      p_email_transactional?: boolean;
      p_email_product_updates?: boolean;
      p_email_marketing?: boolean;
      p_privacy_analytics?: boolean;
      p_consent_version?: string | null;
    },
  ) => RpcResponse;
};

export const studentCommunicationPreferencesRpcClient =
  supabase as unknown as StudentCommunicationPreferencesRpcClient;

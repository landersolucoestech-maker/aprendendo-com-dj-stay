import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

type RpcResponse = PromiseLike<{ data: Json | null; error: unknown | null }>;

type PrivacyRightsRpcClient = {
  rpc: (
    functionName:
      | "create_my_privacy_rights_request"
      | "get_my_privacy_rights_requests"
      | "cancel_my_privacy_rights_request"
      | "admin_get_privacy_rights_requests"
      | "admin_update_privacy_rights_request",
    args?: {
      p_request_type?: "access_export" | "correction" | "deletion" | null;
      p_description?: string;
      p_request_id?: string;
      p_status?:
        | "submitted"
        | "in_review"
        | "completed"
        | "rejected"
        | "cancelled"
        | null;
      p_admin_notes?: string | null;
      p_limit?: number;
      p_offset?: number;
    },
  ) => RpcResponse;
};

export const privacyRightsRpcClient = supabase as unknown as PrivacyRightsRpcClient;

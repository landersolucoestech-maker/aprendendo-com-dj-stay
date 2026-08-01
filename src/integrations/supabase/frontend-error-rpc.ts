import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type {
  FrontendErrorSource,
  FrontendErrorStatus,
} from "@/contracts/frontend-errors";

type RpcResponse = PromiseLike<{
  data: Json | null;
  error: unknown | null;
}>;

type FrontendErrorRpcClient = {
  rpc: {
    (
      functionName: "capture_frontend_error",
      args: {
        p_event_id: string;
        p_source: FrontendErrorSource;
        p_route: string;
        p_error_name: string;
        p_error_message: string;
        p_component_stack?: string;
        p_release?: string;
        p_metadata?: Json;
      },
    ): RpcResponse;
    (
      functionName: "get_frontend_error_dashboard",
      args: {
        p_status?: FrontendErrorStatus;
        p_source?: FrontendErrorSource;
        p_route?: string;
        p_limit?: number;
        p_offset?: number;
      },
    ): RpcResponse;
    (
      functionName: "update_frontend_error_status",
      args: {
        p_frontend_error_id: string;
        p_status: FrontendErrorStatus;
        p_note?: string;
      },
    ): RpcResponse;
    (
      functionName: "purge_frontend_error_events",
      args: {
        p_retention_days?: number;
        p_limit?: number;
      },
    ): RpcResponse;
    (
      functionName: "get_frontend_error_maintenance_history",
      args: {
        p_limit?: number;
        p_offset?: number;
      },
    ): RpcResponse;
  };
};

export const frontendErrorRpcClient =
  supabase as unknown as FrontendErrorRpcClient;

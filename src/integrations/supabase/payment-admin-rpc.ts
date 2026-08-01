import type {
  CheckoutSubjectType,
  PaymentOrderStatus,
} from "@/contracts/payment-admin";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

type RpcResponse = PromiseLike<{
  data: Json | null;
  error: unknown | null;
}>;

type PaymentAdminRpcClient = {
  rpc: (
    functionName: "get_payment_admin_dashboard",
    args: {
      p_status?: PaymentOrderStatus;
      p_subject_type?: CheckoutSubjectType;
      p_search?: string;
      p_limit?: number;
      p_offset?: number;
    },
  ) => RpcResponse;
};

export const paymentAdminRpcClient =
  supabase as unknown as PaymentAdminRpcClient;

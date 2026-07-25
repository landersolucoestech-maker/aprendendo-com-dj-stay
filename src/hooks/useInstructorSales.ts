import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/platform";

export function useInstructorSalesReport() {
  return useQuery({
    queryKey: ["instructor-sales-report"],
    queryFn: async () => {
      const { data, error } = await db
        .from("orders")
        .select(`
          id,order_number,status,currency,subtotal_cents,discount_cents,total_cents,
          customer_snapshot,created_at,paid_at,
          order_items!inner(
            id,course_id,course_title,product_name,offer_name,total_amount_cents
          ),
          payments(
            id,provider,status,payment_method,amount_cents,approved_at
          ),
          refunds(
            id,payment_id,amount_cents,status,reason,processed_at
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  });
}

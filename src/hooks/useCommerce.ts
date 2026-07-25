import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/platform";

export function useCatalogOffers() {
  return useQuery({
    queryKey: ["catalog-offers"],
    queryFn: async () => {
      const { data, error } = await db.from("offers").select(`
        id,name,description,currency,amount_cents,compare_at_cents,lifetime_access,access_days,max_installments,
        products!inner(id,name,description,course_id,courses!inner(id,title,slug,short_description,cover_image_path,category,level,workload_minutes,status))
      `).eq("is_active", true).order("amount_cents", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useActiveCart() {
  return useQuery({
    queryKey: ["active-cart"],
    queryFn: async () => {
      const { data, error } = await db.from("carts").select(`
        id,status,currency,subtotal_cents,discount_cents,total_cents,expires_at,
        coupons(id,code,description),
        cart_items(id,offer_id,unit_amount_cents,total_amount_cents,offer_snapshot,created_at)
      `).eq("status", "active").maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useAddOfferToCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (offerId: string) => {
      const { data, error } = await db.rpc("add_offer_to_cart", { target_offer_id: offerId });
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["active-cart"] }),
  });
}

export function useRemoveCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (cartItemId: string) => {
      const { data, error } = await db.rpc("remove_cart_item", { target_cart_item_id: cartItemId });
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["active-cart"] }),
  });
}

export function useApplyCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => {
      const { data, error } = await db.rpc("apply_coupon_to_cart", { target_code: code });
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["active-cart"] }),
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (cartId: string) => {
      const { data, error } = await db.rpc("create_order_from_cart", { target_cart_id: cartId });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-cart"] });
      queryClient.invalidateQueries({ queryKey: ["my-orders"] });
    },
  });
}

export function useCreateCheckout() {
  return useMutation({
    mutationFn: async (orderId: string) => {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { order_id: orderId },
      });
      if (error) throw error;
      if (!data?.checkout_url) throw new Error(data?.error ?? "Checkout URL was not returned");
      return data as { checkout_url: string; preference_id: string; provider: string };
    },
  });
}

export function useMyOrders() {
  return useQuery({
    queryKey: ["my-orders"],
    queryFn: async () => {
      const { data, error } = await db.from("orders").select(`
        id,order_number,status,currency,subtotal_cents,discount_cents,total_cents,created_at,paid_at,
        order_items(id,product_name,offer_name,course_title,total_amount_cents,course_id),
        payments(id,provider,status,payment_method,amount_cents,approved_at)
      `).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useRefundPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ paymentId, amountCents, reason }: { paymentId: string; amountCents?: number; reason?: string }) => {
      const { data, error } = await supabase.functions.invoke("refund-payment", {
        body: { payment_id: paymentId, amount_cents: amountCents, reason },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instructor-sales"] });
      queryClient.invalidateQueries({ queryKey: ["my-orders"] });
    },
  });
}

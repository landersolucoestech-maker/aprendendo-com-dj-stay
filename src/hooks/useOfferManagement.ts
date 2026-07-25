import { useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/platform";

export function useSaveCourseOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      courseId,
      productId,
      offerId,
      courseTitle,
      amountCents,
      compareAtCents,
      maxInstallments,
      lifetimeAccess,
      accessDays,
      active,
    }: {
      courseId: string;
      productId?: string;
      offerId?: string;
      courseTitle: string;
      amountCents: number;
      compareAtCents?: number | null;
      maxInstallments: number;
      lifetimeAccess: boolean;
      accessDays?: number | null;
      active: boolean;
    }) => {
      let resolvedProductId = productId;
      if (!resolvedProductId) {
        const { data, error } = await db.from("products").insert({
          course_id: courseId,
          name: courseTitle,
          status: "active",
        }).select("id").single();
        if (error) throw error;
        resolvedProductId = data.id;
      } else {
        const { error } = await db.from("products").update({ name: courseTitle, status: "active" }).eq("id", resolvedProductId);
        if (error) throw error;
      }

      const values = {
        product_id: resolvedProductId,
        name: "Oferta principal",
        currency: "BRL",
        amount_cents: amountCents,
        compare_at_cents: compareAtCents || null,
        max_installments: maxInstallments,
        lifetime_access: lifetimeAccess,
        access_days: lifetimeAccess ? null : accessDays,
        is_active: active,
      };
      if (offerId) {
        const { error } = await db.from("offers").update(values).eq("id", offerId);
        if (error) throw error;
      } else {
        const { error } = await db.from("offers").insert(values);
        if (error) throw error;
      }
      return { courseId };
    },
    onSuccess: ({ courseId }) => queryClient.invalidateQueries({ queryKey: ["course-editor", courseId] }),
  });
}

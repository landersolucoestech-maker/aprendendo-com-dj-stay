import { useQuery } from "@tanstack/react-query";

import { paginatedAffiliatePortalSchema } from "@/contracts/affiliate-portal-pagination";
import { parseDataContract } from "@/contracts/contract-error";
import { supabase } from "@/integrations/supabase/client";

export interface AffiliatePortalPaginationInput {
  readonly offerLimit?: number;
  readonly offerOffset?: number;
  readonly linkLimit?: number;
  readonly linkOffset?: number;
  readonly commissionLimit?: number;
  readonly commissionOffset?: number;
  readonly payoutLimit?: number;
  readonly payoutOffset?: number;
  readonly eventLimit?: number;
  readonly eventOffset?: number;
}

const normalizeLimit = (value: number | undefined): number =>
  Math.min(100, Math.max(1, Math.trunc(value ?? 25)));

const normalizeOffset = (value: number | undefined): number =>
  Math.max(0, Math.trunc(value ?? 0));

const normalizeAffiliatePortalPagination = (
  input: AffiliatePortalPaginationInput,
) => ({
  offerLimit: normalizeLimit(input.offerLimit),
  offerOffset: normalizeOffset(input.offerOffset),
  linkLimit: normalizeLimit(input.linkLimit),
  linkOffset: normalizeOffset(input.linkOffset),
  commissionLimit: normalizeLimit(input.commissionLimit),
  commissionOffset: normalizeOffset(input.commissionOffset),
  payoutLimit: normalizeLimit(input.payoutLimit),
  payoutOffset: normalizeOffset(input.payoutOffset),
  eventLimit: normalizeLimit(input.eventLimit),
  eventOffset: normalizeOffset(input.eventOffset),
});

export const useAffiliatePortalPagination = (
  input: AffiliatePortalPaginationInput = {},
) => {
  const filters = normalizeAffiliatePortalPagination(input);

  return useQuery({
    queryKey: ["affiliate", "portal", filters],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_affiliate_portal", {
        p_offer_limit: filters.offerLimit,
        p_offer_offset: filters.offerOffset,
        p_link_limit: filters.linkLimit,
        p_link_offset: filters.linkOffset,
        p_commission_limit: filters.commissionLimit,
        p_commission_offset: filters.commissionOffset,
        p_payout_limit: filters.payoutLimit,
        p_payout_offset: filters.payoutOffset,
        p_event_limit: filters.eventLimit,
        p_event_offset: filters.eventOffset,
      });
      if (error) throw error;

      return parseDataContract(
        paginatedAffiliatePortalSchema,
        data,
        "portal paginado do afiliado",
      );
    },
  });
};

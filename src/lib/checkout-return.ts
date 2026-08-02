import type { CheckoutReturnFound } from "@/contracts/checkout-return";

export type CheckoutReturnViewState =
  | "pending"
  | "finalizing_access"
  | "success"
  | "cancelled"
  | "expired"
  | "failed"
  | "refund_pending"
  | "refunded"
  | "chargeback_pending"
  | "chargeback_won"
  | "chargeback_lost"
  | "access_suspended"
  | "access_revoked";

const pendingOrderStatuses = new Set([
  "checkout_pending",
  "payment_pending",
]);

export const classifyCheckoutReturn = (
  checkout: CheckoutReturnFound,
): CheckoutReturnViewState => {
  if (checkout.entitlement?.status === "revoked") return "access_revoked";
  if (checkout.entitlement?.status === "suspended") return "access_suspended";

  switch (checkout.order?.status) {
    case "refund_pending":
      return "refund_pending";
    case "refunded":
      return "refunded";
    case "chargeback_pending":
      return "chargeback_pending";
    case "chargeback_won":
      return "chargeback_won";
    case "chargeback_lost":
      return "chargeback_lost";
    case "cancelled":
      return "cancelled";
    case "expired":
      return "expired";
    default:
      break;
  }

  if (
    checkout.order?.status === "paid" &&
    checkout.entitlement?.status === "active" &&
    checkout.entitlement.controls_access
  ) {
    return "success";
  }

  if (checkout.order?.status === "paid") return "finalizing_access";
  if (checkout.intent_status === "cancelled" || checkout.attempt?.status === "cancelled") {
    return "cancelled";
  }
  if (checkout.intent_status === "expired" || checkout.attempt?.status === "expired") {
    return "expired";
  }
  if (checkout.intent_status === "provider_failed" || checkout.attempt?.status === "failed") {
    return "failed";
  }
  if (
    checkout.order === null ||
    pendingOrderStatuses.has(checkout.order.status)
  ) {
    return "pending";
  }

  return "pending";
};

export const shouldPollCheckoutReturn = (
  checkout: CheckoutReturnFound,
): boolean => {
  const state = classifyCheckoutReturn(checkout);
  return state === "pending" || state === "finalizing_access";
};

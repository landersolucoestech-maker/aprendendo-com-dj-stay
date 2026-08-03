import { z } from "zod";

import {
  checkoutSubjectTypeSchema,
  paymentOrderStatusSchema,
} from "@/contracts/payment-admin";

const moneyCentsSchema = z.number().int().nonnegative();

const paymentAnalyticsSummarySchema = z
  .object({
    confirmed_orders: z.number().int().nonnegative(),
    unique_customers: z.number().int().nonnegative(),
    gross_revenue_cents: moneyCentsSchema,
    refunded_orders: z.number().int().nonnegative(),
    refunded_amount_cents: moneyCentsSchema,
    chargeback_lost_orders: z.number().int().nonnegative(),
    chargeback_lost_amount_cents: moneyCentsSchema,
    refund_pending_amount_cents: moneyCentsSchema,
    chargeback_pending_amount_cents: moneyCentsSchema,
    net_after_reversals_cents: moneyCentsSchema,
    average_ticket_cents: moneyCentsSchema,
  })
  .strict()
  .superRefine((value, context) => {
    const expectedNet =
      value.gross_revenue_cents -
      value.refunded_amount_cents -
      value.chargeback_lost_amount_cents;
    if (value.net_after_reversals_cents !== expectedNet) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["net_after_reversals_cents"],
        message: "Receita líquida diverge das reversões persistidas.",
      });
    }

    const expectedAverage =
      value.confirmed_orders === 0
        ? 0
        : Math.round(value.gross_revenue_cents / value.confirmed_orders);
    if (value.average_ticket_cents !== expectedAverage) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["average_ticket_cents"],
        message: "Ticket médio diverge dos pedidos confirmados.",
      });
    }
  });

const statusBreakdownSchema = z
  .object({
    status: paymentOrderStatusSchema,
    order_count: z.number().int().nonnegative(),
    amount_cents: moneyCentsSchema,
  })
  .strict();

const subjectBreakdownSchema = z
  .object({
    subject_type: checkoutSubjectTypeSchema,
    order_count: z.number().int().nonnegative(),
    gross_revenue_cents: moneyCentsSchema,
    reversed_amount_cents: moneyCentsSchema,
    net_after_reversals_cents: moneyCentsSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.net_after_reversals_cents !==
      value.gross_revenue_cents - value.reversed_amount_cents
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["net_after_reversals_cents"],
        message: "Resultado por tipo diverge das reversões persistidas.",
      });
    }
  });

const topOfferSchema = subjectBreakdownSchema
  .omit({ subject_type: true })
  .extend({
    subject_type: checkoutSubjectTypeSchema,
    subject_id: z.string().uuid(),
    title: z.string().min(1).max(200),
  })
  .strict();

const dailyPaymentAnalyticsSchema = z
  .object({
    day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    order_count: z.number().int().nonnegative(),
    gross_revenue_cents: moneyCentsSchema,
    reversed_amount_cents: moneyCentsSchema,
    net_after_reversals_cents: moneyCentsSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.net_after_reversals_cents !==
      value.gross_revenue_cents - value.reversed_amount_cents
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["net_after_reversals_cents"],
        message: "Resultado diário diverge das reversões persistidas.",
      });
    }
  });

export const paymentAdminAnalyticsSchema = z
  .object({
    period: z
      .object({
        start_at: z.string().datetime({ offset: true }),
        end_at: z.string().datetime({ offset: true }),
        time_zone: z.literal("America/Sao_Paulo"),
      })
      .strict(),
    summary: paymentAnalyticsSummarySchema,
    status_breakdown: z.array(statusBreakdownSchema).length(10),
    subject_breakdown: z.array(subjectBreakdownSchema).length(2),
    top_offers: z.array(topOfferSchema).max(20),
    daily: z.array(dailyPaymentAnalyticsSchema).min(1).max(367),
  })
  .strict()
  .superRefine((value, context) => {
    if (new Date(value.period.start_at) >= new Date(value.period.end_at)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["period"],
        message: "O período financeiro precisa terminar depois do início.",
      });
    }
  });

export type PaymentAdminAnalytics = z.infer<typeof paymentAdminAnalyticsSchema>;

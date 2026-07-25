import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.50.0";
import { corsHeaders, errorResponse, jsonResponse } from "../_shared/http.ts";

type RefundRequest = { payment_id?: string; amount_cents?: number; reason?: string };

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const accessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    if (!supabaseUrl || !anonKey || !serviceRoleKey || !accessToken) throw new Error("Refund environment is incomplete");

    const authorization = req.headers.get("Authorization");
    if (!authorization) return errorResponse("Authentication required", 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    });
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) return errorResponse("Invalid session", 401);

    const { data: roles } = await userClient.from("user_roles").select("role").eq("user_id", authData.user.id);
    const allowed = roles?.some((entry: { role: string }) => entry.role === "admin" || entry.role === "owner");
    if (!allowed) return errorResponse("Insufficient permissions", 403);

    const body = (await req.json()) as RefundRequest;
    if (!body.payment_id) return errorResponse("payment_id is required", 422);

    const { data: payment, error: paymentError } = await admin
      .from("payments")
      .select("id,order_id,provider,provider_payment_id,status,amount_cents,currency")
      .eq("id", body.payment_id)
      .single();
    if (paymentError || !payment) return errorResponse("Payment not found", 404);
    if (payment.provider !== "mercado_pago") return errorResponse("Payment provider is not supported by this function", 409);
    if (!["approved", "partially_refunded"].includes(payment.status)) return errorResponse("Payment cannot be refunded", 409);

    const { data: priorRefunds } = await admin
      .from("refunds")
      .select("amount_cents")
      .eq("payment_id", payment.id)
      .eq("status", "approved");
    const alreadyRefunded = (priorRefunds ?? []).reduce((sum: number, item: { amount_cents: number }) => sum + item.amount_cents, 0);
    const remaining = payment.amount_cents - alreadyRefunded;
    const amountCents = body.amount_cents ?? remaining;
    if (!Number.isInteger(amountCents) || amountCents <= 0 || amountCents > remaining) {
      return errorResponse("Invalid refund amount", 422);
    }

    const idempotencyKey = crypto.randomUUID();
    const endpoint = `https://api.mercadopago.com/v1/payments/${encodeURIComponent(payment.provider_payment_id)}/refunds`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(amountCents === remaining ? {} : { amount: amountCents / 100 }),
    });
    const providerBody = await response.json();

    const status = response.ok ? "approved" : "rejected";
    const { data: refund, error: refundError } = await admin.from("refunds").insert({
      payment_id: payment.id,
      order_id: payment.order_id,
      provider_refund_id: providerBody.id ? String(providerBody.id) : null,
      amount_cents: amountCents,
      reason: body.reason?.trim() || null,
      status,
      requested_by: authData.user.id,
      processed_at: new Date().toISOString(),
      raw_payload: providerBody,
    }).select("id,status,amount_cents").single();
    if (refundError) throw new Error(refundError.message);

    if (!response.ok) {
      return jsonResponse({ error: "Refund rejected by provider", refund, provider_error: providerBody }, 502);
    }

    return jsonResponse({ refund, provider_refund_id: providerBody.id ?? null });
  } catch (error) {
    console.error("refund-payment", error);
    return errorResponse(error, 500);
  }
});

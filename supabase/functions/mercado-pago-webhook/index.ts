import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.50.0";
import { errorResponse, jsonResponse } from "../_shared/http.ts";

function parseSignature(header: string): { ts?: string; v1?: string } {
  return Object.fromEntries(
    header.split(",").map((part) => part.trim().split("=", 2) as [string, string]),
  );
}

async function hmacHex(secret: string, value: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return Array.from(new Uint8Array(signature)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return result === 0;
}

function mapStatus(status: string): string {
  const map: Record<string, string> = {
    approved: "approved",
    pending: "pending",
    authorized: "processing",
    in_process: "processing",
    in_mediation: "processing",
    rejected: "rejected",
    cancelled: "cancelled",
    refunded: "refunded",
    charged_back: "chargeback",
  };
  return map[status] ?? "pending";
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const accessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
  const webhookSecret = Deno.env.get("MERCADO_PAGO_WEBHOOK_SECRET");
  if (!supabaseUrl || !serviceRoleKey || !accessToken || !webhookSecret) {
    return errorResponse("Webhook environment is incomplete", 500);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let eventId = "unknown";
  try {
    const url = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    const dataId = String(url.searchParams.get("data.id") ?? url.searchParams.get("data_id") ?? body?.data?.id ?? "");
    const xSignature = req.headers.get("x-signature") ?? "";
    const xRequestId = req.headers.get("x-request-id") ?? "";
    const { ts, v1 } = parseSignature(xSignature);

    if (!dataId || !ts || !v1 || !xRequestId) return errorResponse("Invalid webhook signature headers", 401);

    const manifestParts = [`id:${dataId};`, `request-id:${xRequestId};`, `ts:${ts};`];
    const calculated = await hmacHex(webhookSecret, manifestParts.join(""));
    if (!constantTimeEqual(calculated, v1)) return errorResponse("Invalid webhook signature", 401);

    eventId = String(body?.id ?? `${body?.action ?? body?.type ?? "payment"}:${dataId}:${ts}`);
    const { data: existingEvent } = await admin
      .from("webhook_events")
      .select("id,processing_status")
      .eq("provider", "mercado_pago")
      .eq("provider_event_id", eventId)
      .maybeSingle();

    if (existingEvent?.processing_status === "processed") {
      return jsonResponse({ received: true, duplicate: true });
    }

    const { data: event, error: eventError } = await admin
      .from("webhook_events")
      .upsert({
        provider: "mercado_pago",
        provider_event_id: eventId,
        event_type: String(body?.action ?? body?.type ?? "payment.updated"),
        signature_valid: true,
        payload: body,
        processing_status: "processing",
        attempts: (existingEvent ? 1 : 0) + 1,
      }, { onConflict: "provider,provider_event_id" })
      .select("id")
      .single();
    if (eventError || !event) throw new Error(eventError?.message ?? "Could not register webhook");

    if (String(body?.type ?? "payment") !== "payment" && !String(body?.action ?? "").startsWith("payment.")) {
      await admin.from("webhook_events").update({ processing_status: "ignored", processed_at: new Date().toISOString() }).eq("id", event.id);
      return jsonResponse({ received: true, ignored: true });
    }

    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(dataId)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const payment = await paymentResponse.json();
    if (!paymentResponse.ok) throw new Error(`Mercado Pago payment lookup failed: ${paymentResponse.status}`);

    const orderId = String(payment.external_reference ?? payment.metadata?.order_id ?? "");
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderId)) {
      await admin.from("webhook_events").update({ processing_status: "ignored", processed_at: new Date().toISOString(), error_message: "Order reference missing" }).eq("id", event.id);
      return jsonResponse({ received: true, ignored: true });
    }

    const normalizedStatus = mapStatus(String(payment.status ?? "pending"));
    const amountCents = Math.round(Number(payment.transaction_amount ?? 0) * 100);
    const { error: paymentError } = await admin.from("payments").upsert({
      order_id: orderId,
      provider: "mercado_pago",
      provider_payment_id: String(payment.id),
      status: normalizedStatus,
      payment_method: String(payment.payment_type_id ?? payment.payment_method_id ?? ""),
      installments: payment.installments ? Number(payment.installments) : null,
      amount_cents: amountCents,
      currency: String(payment.currency_id ?? "BRL"),
      approved_at: payment.date_approved ?? null,
      rejected_at: normalizedStatus === "rejected" ? (payment.date_last_updated ?? new Date().toISOString()) : null,
      raw_payload: payment,
    }, { onConflict: "provider,provider_payment_id" });
    if (paymentError) throw new Error(paymentError.message);

    await admin.from("payment_attempts").update({
      status: normalizedStatus,
      response_payload: payment,
      updated_at: new Date().toISOString(),
    }).eq("order_id", orderId).eq("provider", "mercado_pago").in("status", ["created", "pending", "processing"]);

    await admin.from("webhook_events").update({
      processing_status: "processed",
      processed_at: new Date().toISOString(),
      error_message: null,
    }).eq("id", event.id);

    return jsonResponse({ received: true, order_id: orderId, payment_status: normalizedStatus });
  } catch (error) {
    console.error("mercado-pago-webhook", error);
    if (eventId !== "unknown") {
      await admin.from("webhook_events").update({
        processing_status: "failed",
        error_message: error instanceof Error ? error.message : "Unexpected webhook error",
      }).eq("provider", "mercado_pago").eq("provider_event_id", eventId);
    }
    return errorResponse(error, 500);
  }
});

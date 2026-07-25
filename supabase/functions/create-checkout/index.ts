import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.50.0";
import { corsHeaders, errorResponse, jsonResponse } from "../_shared/http.ts";

type CheckoutRequest = { order_id?: string };

type OrderItem = {
  id: string;
  product_name: string;
  course_title: string;
  total_amount_cents: number;
  quantity: number;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const mercadoPagoToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    const siteUrl = Deno.env.get("SITE_URL");

    if (!supabaseUrl || !anonKey || !serviceRoleKey || !mercadoPagoToken || !siteUrl) {
      throw new Error("Checkout environment is incomplete");
    }

    const authorization = req.headers.get("Authorization");
    if (!authorization) return errorResponse("Authentication required", 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) return errorResponse("Invalid session", 401);

    const payload = (await req.json()) as CheckoutRequest;
    if (!payload.order_id) return errorResponse("order_id is required", 422);

    const { data: order, error: orderError } = await userClient
      .from("orders")
      .select("id,order_number,user_id,status,currency,total_cents,customer_snapshot")
      .eq("id", payload.order_id)
      .single();
    if (orderError || !order) return errorResponse("Order not found", 404);
    if (order.user_id !== authData.user.id) return errorResponse("Order not found", 404);
    if (!['awaiting_payment', 'pending'].includes(order.status)) {
      return errorResponse("Order is not available for payment", 409);
    }

    const { data: existingAttempt } = await userClient
      .from("payment_attempts")
      .select("id,checkout_url,provider_checkout_id,status,expires_at")
      .eq("order_id", order.id)
      .eq("provider", "mercado_pago")
      .in("status", ["created", "pending"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingAttempt?.checkout_url && (!existingAttempt.expires_at || new Date(existingAttempt.expires_at) > new Date())) {
      return jsonResponse({
        provider: "mercado_pago",
        checkout_url: existingAttempt.checkout_url,
        preference_id: existingAttempt.provider_checkout_id,
        reused: true,
      });
    }

    const { data: items, error: itemsError } = await userClient
      .from("order_items")
      .select("id,product_name,course_title,total_amount_cents,quantity")
      .eq("order_id", order.id);
    if (itemsError || !items?.length) return errorResponse("Order has no items", 409);

    const idempotencyKey = crypto.randomUUID();
    const { data: attempt, error: attemptError } = await adminClient
      .from("payment_attempts")
      .insert({
        order_id: order.id,
        provider: "mercado_pago",
        idempotency_key: idempotencyKey,
        status: "created",
        request_payload: { order_id: order.id },
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      })
      .select("id")
      .single();
    if (attemptError || !attempt) throw new Error(attemptError?.message ?? "Could not create payment attempt");

    const payerName = String(order.customer_snapshot?.full_name ?? "").trim();
    const [firstName, ...lastNameParts] = payerName.split(/\s+/);
    const preferencePayload = {
      items: (items as OrderItem[]).map((item) => ({
        id: item.id,
        title: item.course_title || item.product_name,
        description: item.product_name,
        quantity: item.quantity,
        currency_id: order.currency,
        unit_price: item.total_amount_cents / 100,
      })),
      payer: {
        email: authData.user.email,
        name: firstName || undefined,
        surname: lastNameParts.join(" ") || undefined,
      },
      external_reference: order.id,
      metadata: { order_id: order.id, order_number: order.order_number, user_id: authData.user.id },
      back_urls: {
        success: `${siteUrl}/pagamento-sucesso?order_id=${order.id}`,
        pending: `${siteUrl}/pedidos?order_id=${order.id}&status=pending`,
        failure: `${siteUrl}/checkout?order_id=${order.id}&status=failure`,
      },
      auto_return: "approved",
      notification_url: `${supabaseUrl}/functions/v1/mercado-pago-webhook`,
      payment_methods: { installments: 12 },
      statement_descriptor: "DJ STAY CURSOS",
    };

    const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mercadoPagoToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(preferencePayload),
    });
    const mpBody = await mpResponse.json();

    if (!mpResponse.ok || !mpBody.id || !mpBody.init_point) {
      await adminClient.from("payment_attempts").update({
        status: "rejected",
        response_payload: mpBody,
        error_code: String(mpBody.error ?? mpResponse.status),
        error_message: String(mpBody.message ?? "Mercado Pago preference failed"),
      }).eq("id", attempt.id);
      return jsonResponse({ error: "Payment provider rejected checkout creation", provider_error: mpBody }, 502);
    }

    await adminClient.from("payment_attempts").update({
      provider_checkout_id: String(mpBody.id),
      checkout_url: String(mpBody.init_point),
      status: "pending",
      request_payload: preferencePayload,
      response_payload: mpBody,
    }).eq("id", attempt.id);

    return jsonResponse({
      provider: "mercado_pago",
      checkout_url: mpBody.init_point,
      sandbox_checkout_url: mpBody.sandbox_init_point ?? null,
      preference_id: mpBody.id,
      reused: false,
    });
  } catch (error) {
    console.error("create-checkout", error);
    return errorResponse(error, 500);
  }
});

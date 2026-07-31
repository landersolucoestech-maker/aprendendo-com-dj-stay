import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

interface CheckoutIntent {
  id: string;
  user_id: string;
  subject_type: "course" | "digital_product";
  subject_id: string;
  license_id: string | null;
  status:
    | "prepared"
    | "provider_creating"
    | "checkout_created"
    | "provider_failed"
    | "expired"
    | "cancelled";
  amount_cents: number;
  currency_code: "BRL";
  title_snapshot: string;
  provider_checkout_url: string | null;
  expires_at: string | null;
}

interface ProviderClaim {
  claimed: boolean;
  reason: string | null;
  request_token?: string;
  intent: CheckoutIntent;
}

interface CheckoutRequest {
  subjectType: "course" | "digital_product";
  subjectId: string;
  licenseId: string | null;
  idempotencyKey: string;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEFAULT_DEV_ORIGINS = new Set([
  "http://127.0.0.1:8080",
  "http://localhost:8080",
  "http://127.0.0.1:5173",
  "http://localhost:5173",
]);
const ALLOWED_ASAAS_BASE_URLS = new Set([
  "https://api-sandbox.asaas.com",
  "https://api.asaas.com",
]);

const parseSecretKey = (): string => {
  const modernKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (modernKeys) {
    try {
      const parsed: unknown = JSON.parse(modernKeys);
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        "default" in parsed &&
        typeof parsed.default === "string" &&
        parsed.default.length > 0
      ) {
        return parsed.default;
      }
    } catch {
      // Fall through to the legacy service role key.
    }
  }

  const legacyKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!legacyKey) throw new Error("SUPABASE_SERVER_CREDENTIAL_NOT_CONFIGURED");
  return legacyKey;
};

const getAllowedOrigins = (): Set<string> => {
  const configured = Deno.env.get("CHECKOUT_ALLOWED_ORIGINS")
    ?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  return new Set(configured && configured.length > 0 ? configured : DEFAULT_DEV_ORIGINS);
};

const getRequestOrigin = (request: Request): string | null => {
  const origin = request.headers.get("origin");
  if (origin) return origin;

  const referer = request.headers.get("referer");
  if (!referer) return null;
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
};

const jsonResponse = (
  body: Record<string, unknown>,
  status: number,
  origin: string | null,
): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      ...(origin ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : {}),
    },
  });

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseCheckoutRequest = async (request: Request): Promise<CheckoutRequest> => {
  const payload: unknown = await request.json();
  if (!isObject(payload)) throw new Error("INVALID_CHECKOUT_REQUEST");

  const subjectType = payload.subjectType;
  const subjectId = payload.subjectId;
  const licenseId = payload.licenseId ?? null;
  const idempotencyKey = payload.idempotencyKey;

  if (
    (subjectType !== "course" && subjectType !== "digital_product") ||
    typeof subjectId !== "string" ||
    !UUID_PATTERN.test(subjectId) ||
    typeof idempotencyKey !== "string" ||
    !UUID_PATTERN.test(idempotencyKey) ||
    (licenseId !== null && (typeof licenseId !== "string" || !UUID_PATTERN.test(licenseId)))
  ) {
    throw new Error("INVALID_CHECKOUT_REQUEST");
  }

  if (subjectType === "course" && licenseId !== null) {
    throw new Error("COURSE_LICENSE_NOT_ALLOWED");
  }

  return { subjectType, subjectId, licenseId, idempotencyKey };
};

const parseIntent = (value: unknown): CheckoutIntent => {
  if (!isObject(value)) throw new Error("INVALID_CHECKOUT_INTENT");
  const status = value.status;
  const subjectType = value.subject_type;

  if (
    typeof value.id !== "string" ||
    !UUID_PATTERN.test(value.id) ||
    typeof value.user_id !== "string" ||
    !UUID_PATTERN.test(value.user_id) ||
    (subjectType !== "course" && subjectType !== "digital_product") ||
    typeof value.subject_id !== "string" ||
    !UUID_PATTERN.test(value.subject_id) ||
    !new Set([
      "prepared",
      "provider_creating",
      "checkout_created",
      "provider_failed",
      "expired",
      "cancelled",
    ]).has(String(status)) ||
    typeof value.amount_cents !== "number" ||
    !Number.isInteger(value.amount_cents) ||
    value.amount_cents <= 0 ||
    value.currency_code !== "BRL" ||
    typeof value.title_snapshot !== "string"
  ) {
    throw new Error("INVALID_CHECKOUT_INTENT");
  }

  return value as unknown as CheckoutIntent;
};

const parseClaim = (value: unknown): ProviderClaim => {
  if (!isObject(value) || typeof value.claimed !== "boolean") {
    throw new Error("INVALID_PROVIDER_CLAIM");
  }
  return {
    claimed: value.claimed,
    reason: typeof value.reason === "string" ? value.reason : null,
    request_token: typeof value.request_token === "string" ? value.request_token : undefined,
    intent: parseIntent(value.intent),
  };
};

const appendIntentId = (rawUrl: string, intentId: string): string => {
  const url = new URL(rawUrl);
  url.searchParams.set("checkout_intent", intentId);
  return url.toString();
};

const requireCallbackUrl = (name: string, intentId: string): string => {
  const rawValue = Deno.env.get(name);
  if (!rawValue) throw new Error(`${name}_NOT_CONFIGURED`);
  const url = appendIntentId(rawValue, intentId);
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" && !DEFAULT_DEV_ORIGINS.has(parsed.origin)) {
    throw new Error(`${name}_INVALID`);
  }
  return url;
};

const getExpirationMinutes = (): number => {
  const parsed = Number(Deno.env.get("ASAAS_CHECKOUT_EXPIRATION_MINUTES") ?? "30");
  if (!Number.isInteger(parsed) || parsed < 10 || parsed > 1440) {
    throw new Error("ASAAS_CHECKOUT_EXPIRATION_MINUTES_INVALID");
  }
  return parsed;
};

const getAsaasConfiguration = (): { apiKey: string; baseUrl: string } => {
  const apiKey = Deno.env.get("ASAAS_API_KEY");
  const baseUrl = (Deno.env.get("ASAAS_API_BASE_URL") ?? "https://api-sandbox.asaas.com").replace(/\/$/, "");
  if (!apiKey) throw new Error("ASAAS_API_KEY_NOT_CONFIGURED");
  if (!ALLOWED_ASAAS_BASE_URLS.has(baseUrl)) throw new Error("ASAAS_API_BASE_URL_INVALID");
  return { apiKey, baseUrl };
};

const createAsaasCheckout = async (
  intent: CheckoutIntent,
): Promise<{ id: string; url: string; expiresAt: string }> => {
  const { apiKey, baseUrl } = getAsaasConfiguration();
  const expirationMinutes = getExpirationMinutes();
  const successUrl = requireCallbackUrl("CHECKOUT_SUCCESS_URL", intent.id);
  const cancelUrl = requireCallbackUrl("CHECKOUT_CANCEL_URL", intent.id);
  const expiredUrl = requireCallbackUrl("CHECKOUT_EXPIRED_URL", intent.id);

  const response = await fetch(`${baseUrl}/v3/checkouts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      access_token: apiKey,
      "User-Agent": "aprendendo-com-dj-stay-checkout/1.0",
    },
    body: JSON.stringify({
      billingTypes: ["PIX", "CREDIT_CARD"],
      chargeTypes: ["DETACHED"],
      minutesToExpire: expirationMinutes,
      externalReference: intent.id,
      callback: { successUrl, cancelUrl, expiredUrl },
      items: [
        {
          name: intent.title_snapshot,
          description:
            intent.subject_type === "course"
              ? "Acesso ao curso digital"
              : "Licença de produto digital",
          quantity: 1,
          value: intent.amount_cents / 100,
        },
      ],
    }),
  });

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    console.error("Asaas checkout request failed", { status: response.status });
    throw new Error(`ASAAS_HTTP_${response.status}`);
  }
  if (!isObject(payload)) throw new Error("ASAAS_RESPONSE_INVALID");

  const providerId = payload.id;
  const providerUrl = payload.link ?? payload.url;
  if (
    typeof providerId !== "string" ||
    providerId.length === 0 ||
    typeof providerUrl !== "string" ||
    !providerUrl.startsWith("https://")
  ) {
    throw new Error("ASAAS_RESPONSE_INVALID");
  }

  const rawExpiration = payload.expiration;
  const calculatedExpiration = new Date(Date.now() + expirationMinutes * 60_000).toISOString();
  const expiresAt =
    typeof rawExpiration === "string" && !Number.isNaN(Date.parse(rawExpiration))
      ? new Date(rawExpiration).toISOString()
      : calculatedExpiration;

  return { id: providerId, url: providerUrl, expiresAt };
};

Deno.serve(async (request: Request) => {
  const allowedOrigins = getAllowedOrigins();
  const origin = getRequestOrigin(request);

  if (request.method === "OPTIONS") {
    if (!origin || !allowedOrigins.has(origin)) return new Response(null, { status: 403 });
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
        "Access-Control-Max-Age": "600",
        Vary: "Origin",
      },
    });
  }

  if (!origin || !allowedOrigins.has(origin)) {
    return jsonResponse({ error: "ORIGIN_NOT_ALLOWED" }, 403, null);
  }
  if (request.method !== "POST") {
    return jsonResponse({ error: "METHOD_NOT_ALLOWED" }, 405, origin);
  }

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return jsonResponse({ error: "AUTHORIZATION_REQUIRED" }, 401, origin);
  }

  let intent: CheckoutIntent | null = null;
  let requestToken: string | null = null;

  try {
    const input = await parseCheckoutRequest(request);
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !anonKey) throw new Error("SUPABASE_PUBLIC_CONFIGURATION_MISSING");

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) {
      return jsonResponse({ error: "AUTH_SESSION_INVALID" }, 401, origin);
    }

    const { data: prepared, error: prepareError } = await userClient.rpc(
      "prepare_checkout_intent",
      {
        p_subject_type: input.subjectType,
        p_subject_id: input.subjectId,
        p_license_id: input.licenseId,
        p_idempotency_key: input.idempotencyKey,
      },
    );
    if (prepareError) throw new Error(`CHECKOUT_PREPARE_${prepareError.code}`);
    intent = parseIntent(prepared);

    if (
      intent.status === "checkout_created" &&
      intent.provider_checkout_url &&
      intent.expires_at &&
      Date.parse(intent.expires_at) > Date.now()
    ) {
      return jsonResponse(
        {
          checkoutIntentId: intent.id,
          checkoutUrl: intent.provider_checkout_url,
          expiresAt: intent.expires_at,
          status: intent.status,
        },
        200,
        origin,
      );
    }

    const serviceClient = createClient(supabaseUrl, parseSecretKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: claimedData, error: claimError } = await serviceClient.rpc(
      "claim_checkout_provider_request",
      {
        p_intent_id: intent.id,
        p_user_id: userData.user.id,
        p_lease_seconds: 120,
      },
    );
    if (claimError) throw new Error(`CHECKOUT_CLAIM_${claimError.code}`);

    const claim = parseClaim(claimedData);
    if (!claim.claimed) {
      if (
        claim.reason === "CHECKOUT_ALREADY_CREATED" &&
        claim.intent.provider_checkout_url &&
        claim.intent.expires_at
      ) {
        return jsonResponse(
          {
            checkoutIntentId: claim.intent.id,
            checkoutUrl: claim.intent.provider_checkout_url,
            expiresAt: claim.intent.expires_at,
            status: claim.intent.status,
          },
          200,
          origin,
        );
      }
      return jsonResponse(
        { checkoutIntentId: claim.intent.id, error: claim.reason ?? "CHECKOUT_IN_PROGRESS" },
        409,
        origin,
      );
    }

    if (!claim.request_token || !UUID_PATTERN.test(claim.request_token)) {
      throw new Error("CHECKOUT_CLAIM_TOKEN_INVALID");
    }
    requestToken = claim.request_token;
    intent = claim.intent;

    const providerCheckout = await createAsaasCheckout(intent);
    const { data: completed, error: completeError } = await serviceClient.rpc(
      "complete_checkout_provider_request",
      {
        p_intent_id: intent.id,
        p_user_id: userData.user.id,
        p_request_token: requestToken,
        p_provider_checkout_id: providerCheckout.id,
        p_provider_checkout_url: providerCheckout.url,
        p_expires_at: providerCheckout.expiresAt,
      },
    );
    if (completeError) throw new Error(`CHECKOUT_COMPLETE_${completeError.code}`);

    const completedIntent = parseIntent(completed);
    return jsonResponse(
      {
        checkoutIntentId: completedIntent.id,
        checkoutUrl: completedIntent.provider_checkout_url,
        expiresAt: completedIntent.expires_at,
        status: completedIntent.status,
      },
      201,
      origin,
    );
  } catch (error: unknown) {
    const code = error instanceof Error ? error.message.slice(0, 100) : "CHECKOUT_UNEXPECTED_ERROR";
    console.error("Checkout creation failed", { code });

    if (intent && requestToken) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        if (supabaseUrl) {
          const serviceClient = createClient(supabaseUrl, parseSecretKey(), {
            auth: { persistSession: false, autoRefreshToken: false },
          });
          await serviceClient.rpc("fail_checkout_provider_request", {
            p_intent_id: intent.id,
            p_user_id: intent.user_id,
            p_request_token: requestToken,
            p_failure_code: code,
            p_failure_reason: "Não foi possível criar a sessão de checkout no provedor.",
          });
        }
      } catch {
        console.error("Checkout failure state could not be persisted", { intentId: intent.id });
      }
    }

    const publicCode = code.startsWith("INVALID_") || code.startsWith("COURSE_")
      ? code
      : "CHECKOUT_CREATION_FAILED";
    return jsonResponse({ error: publicCode }, publicCode.startsWith("INVALID_") ? 400 : 502, origin);
  }
});

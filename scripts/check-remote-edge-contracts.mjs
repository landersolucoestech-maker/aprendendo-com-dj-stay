import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const baseUrl = process.env.SUPABASE_DEV_FUNCTIONS_BASE_URL;
const allowedOrigin = process.env.EDGE_SMOKE_ALLOWED_ORIGIN ?? "http://localhost:5173";
const disallowedOrigin = "https://edge-smoke.invalid";

if (!baseUrl || !baseUrl.startsWith("https://")) {
  throw new Error("SUPABASE_DEV_FUNCTIONS_BASE_URL ausente ou inválida.");
}

const normalizedBaseUrl = baseUrl.replace(/\/$/, "");
const evidence = [];
const failures = [];

const request = async ({ name, slug, method = "POST", origin, body, headers = {} }) => {
  const response = await fetch(`${normalizedBaseUrl}/${slug}`, {
    method,
    redirect: "error",
    signal: AbortSignal.timeout(15_000),
    headers: {
      ...(origin ? { Origin: origin } : {}),
      ...headers,
    },
    body,
  });

  const rawBody = await response.text();
  let payload = null;
  try {
    payload = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    payload = rawBody;
  }

  const result = {
    name,
    slug,
    method,
    origin: origin ?? null,
    status: response.status,
    payload,
    headers: {
      accessControlAllowOrigin: response.headers.get("access-control-allow-origin"),
      accessControlAllowMethods: response.headers.get("access-control-allow-methods"),
      cacheControl: response.headers.get("cache-control"),
      contentType: response.headers.get("content-type"),
      xContentTypeOptions: response.headers.get("x-content-type-options"),
      vary: response.headers.get("vary"),
    },
  };
  evidence.push(result);
  return result;
};

const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

const expectJsonError = (result, status, code) => {
  expect(result.status === status, `${result.name}: esperado HTTP ${status}, recebido ${result.status}`);
  expect(
    result.payload && typeof result.payload === "object" && result.payload.error === code,
    `${result.name}: esperado erro ${code}, recebido ${JSON.stringify(result.payload)}`,
  );
  expect(
    result.headers.cacheControl?.includes("no-store") === true,
    `${result.name}: Cache-Control no-store ausente`,
  );
  expect(
    result.headers.xContentTypeOptions === "nosniff",
    `${result.name}: X-Content-Type-Options nosniff ausente`,
  );
};

const checkoutPreflight = await request({
  name: "checkout-preflight-allowed",
  slug: "create-asaas-checkout",
  method: "OPTIONS",
  origin: allowedOrigin,
  headers: {
    "Access-Control-Request-Method": "POST",
    "Access-Control-Request-Headers": "authorization, content-type",
  },
});
expect(checkoutPreflight.status === 204, `checkout-preflight-allowed: esperado HTTP 204, recebido ${checkoutPreflight.status}`);
expect(
  checkoutPreflight.headers.accessControlAllowOrigin === allowedOrigin,
  "checkout-preflight-allowed: origem permitida não foi refletida",
);
expect(
  checkoutPreflight.headers.accessControlAllowMethods?.includes("POST") === true,
  "checkout-preflight-allowed: método POST ausente",
);

const checkoutNoAuth = await request({
  name: "checkout-auth-required",
  slug: "create-asaas-checkout",
  origin: allowedOrigin,
  headers: { "Content-Type": "application/json" },
  body: "{}",
});
expectJsonError(checkoutNoAuth, 401, "AUTHORIZATION_REQUIRED");
expect(
  checkoutNoAuth.headers.accessControlAllowOrigin === allowedOrigin,
  "checkout-auth-required: CORS da origem permitida ausente",
);

const checkoutBadOrigin = await request({
  name: "checkout-origin-denied",
  slug: "create-asaas-checkout",
  origin: disallowedOrigin,
  headers: { "Content-Type": "application/json" },
  body: "{}",
});
expectJsonError(checkoutBadOrigin, 403, "ORIGIN_NOT_ALLOWED");
expect(
  checkoutBadOrigin.headers.accessControlAllowOrigin === null,
  "checkout-origin-denied: origem proibida foi refletida",
);

const playbackPreflight = await request({
  name: "playback-preflight-allowed",
  slug: "media-playback",
  method: "OPTIONS",
  origin: allowedOrigin,
  headers: {
    "Access-Control-Request-Method": "POST",
    "Access-Control-Request-Headers": "content-type",
  },
});
expect(playbackPreflight.status === 204, `playback-preflight-allowed: esperado HTTP 204, recebido ${playbackPreflight.status}`);
expect(
  playbackPreflight.headers.accessControlAllowOrigin === allowedOrigin,
  "playback-preflight-allowed: origem permitida não foi refletida",
);
expect(
  playbackPreflight.headers.accessControlAllowMethods?.includes("POST") === true,
  "playback-preflight-allowed: método POST ausente",
);

const playbackInvalid = await request({
  name: "playback-invalid-credentials",
  slug: "media-playback",
  origin: allowedOrigin,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ token: "invalid", fingerprint: "invalid" }),
});
expectJsonError(playbackInvalid, 400, "INVALID_PLAYBACK_CREDENTIALS");
expect(
  playbackInvalid.headers.accessControlAllowOrigin === allowedOrigin,
  "playback-invalid-credentials: CORS da origem permitida ausente",
);

const playbackBadOrigin = await request({
  name: "playback-origin-denied",
  slug: "media-playback",
  origin: disallowedOrigin,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ token: "invalid", fingerprint: "invalid" }),
});
expectJsonError(playbackBadOrigin, 403, "ORIGIN_NOT_ALLOWED");
expect(
  playbackBadOrigin.headers.accessControlAllowOrigin === null,
  "playback-origin-denied: origem proibida foi refletida",
);

const webhookProbe = await request({
  name: "webhook-authentication-required",
  slug: "asaas-webhook",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ id: "configuration-probe", event: "PAYMENT_CREATED" }),
});
expectJsonError(webhookProbe, 401, "WEBHOOK_AUTHENTICATION_FAILED");

mkdirSync(path.join("artifacts", "remote-edge-contracts"), { recursive: true });
writeFileSync(
  path.join("artifacts", "remote-edge-contracts", "evidence.json"),
  `${JSON.stringify({ checkedAt: new Date().toISOString(), baseUrl: normalizedBaseUrl, allowedOrigin, evidence }, null, 2)}\n`,
  "utf8",
);

if (failures.length > 0) {
  console.error("Smoke remoto das Edge Functions bloqueado:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(
  "Smoke remoto aprovado: checkout e playback preservam CORS e falha fechada; webhook exige token configurado sem persistir o probe.",
);

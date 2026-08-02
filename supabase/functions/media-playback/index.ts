import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

import { parsePlaybackResolution } from "../_shared/playback-contract.ts";

const TOKEN_PATTERN = /^[a-f0-9]{48}$/;
const FINGERPRINT_PATTERN = /^[a-f0-9]{64}$/;
const DEFAULT_DEV_ORIGINS = new Set([
  "http://127.0.0.1:8080",
  "http://localhost:8080",
  "http://127.0.0.1:5173",
  "http://localhost:5173",
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
  if (!legacyKey) {
    throw new Error("Supabase server credential is not configured.");
  }

  return legacyKey;
};

const getAllowedOrigins = (): Set<string> => {
  const configured = Deno.env.get("PLAYBACK_ALLOWED_ORIGINS")
    ?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return new Set(configured && configured.length > 0 ? configured : DEFAULT_DEV_ORIGINS);
};

const getRequestOrigin = (request: Request): string | null => {
  const origin = request.headers.get("origin");
  if (origin) {
    return origin;
  }

  const referer = request.headers.get("referer");
  if (!referer) {
    return null;
  }

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

const parseCredentials = async (
  request: Request,
): Promise<{ token: string; fingerprint: string }> => {
  if (request.method === "POST") {
    const payload: unknown = await request.json();
    if (typeof payload !== "object" || payload === null) {
      throw new Error("INVALID_REQUEST");
    }

    const token = "token" in payload ? payload.token : null;
    const fingerprint = "fingerprint" in payload ? payload.fingerprint : null;
    if (typeof token !== "string" || typeof fingerprint !== "string") {
      throw new Error("INVALID_REQUEST");
    }

    return { token, fingerprint };
  }

  const url = new URL(request.url);
  return {
    token: url.searchParams.get("token") ?? "",
    fingerprint: url.searchParams.get("fingerprint") ?? "",
  };
};

Deno.serve(async (request: Request) => {
  const allowedOrigins = getAllowedOrigins();
  const requestOrigin = getRequestOrigin(request);

  if (request.method === "OPTIONS") {
    if (!requestOrigin || !allowedOrigins.has(requestOrigin)) {
      return new Response(null, { status: 403 });
    }

    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": requestOrigin,
        "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
        "Access-Control-Max-Age": "600",
        Vary: "Origin",
      },
    });
  }

  if (!requestOrigin || !allowedOrigins.has(requestOrigin)) {
    return jsonResponse({ error: "ORIGIN_NOT_ALLOWED" }, 403, null);
  }

  if (!new Set(["GET", "HEAD", "POST"]).has(request.method)) {
    return jsonResponse({ error: "METHOD_NOT_ALLOWED" }, 405, requestOrigin);
  }

  try {
    const { token, fingerprint } = await parseCredentials(request);
    if (!TOKEN_PATTERN.test(token) || !FINGERPRINT_PATTERN.test(fingerprint)) {
      return jsonResponse({ error: "INVALID_PLAYBACK_CREDENTIALS" }, 400, requestOrigin);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!supabaseUrl) {
      throw new Error("SUPABASE_URL_NOT_CONFIGURED");
    }

    const secretKey = parseSecretKey();
    const admin = createClient(supabaseUrl, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await admin.rpc("resolve_lesson_playback_token", {
      p_token: token,
      p_fingerprint_hash: fingerprint,
    });

    if (error) {
      console.error("Playback resolver failed", { code: error.code });
      return jsonResponse({ error: "PLAYBACK_RESOLUTION_FAILED" }, 502, requestOrigin);
    }

    const resolution = parsePlaybackResolution(Array.isArray(data) ? data[0] : data);
    if (!resolution) {
      console.error("Playback resolver returned an invalid contract");
      return jsonResponse({ error: "PLAYBACK_RESOLUTION_FAILED" }, 502, requestOrigin);
    }

    if (!resolution.granted || !resolution.provider || !resolution.expires_at) {
      return jsonResponse(
        { error: resolution?.reason ?? "PLAYBACK_DENIED" },
        403,
        requestOrigin,
      );
    }

    if (request.method === "POST") {
      const streamUrl =
        resolution.provider === "private_asset"
          ? `${new URL(request.url).origin}${new URL(request.url).pathname}?${new URLSearchParams({ token, fingerprint }).toString()}`
          : null;

      return jsonResponse(
        {
          granted: true,
          provider: resolution.provider,
          embedUrl: resolution.embed_url,
          streamUrl,
          watermarkText: resolution.watermark_text,
          expiresAt: resolution.expires_at,
        },
        200,
        requestOrigin,
      );
    }

    if (
      resolution.provider !== "private_asset" ||
      !resolution.bucket_id ||
      !resolution.object_path
    ) {
      return jsonResponse({ error: "PRIVATE_MEDIA_REQUIRED" }, 400, requestOrigin);
    }

    const { data: signed, error: signedError } = await admin.storage
      .from(resolution.bucket_id)
      .createSignedUrl(resolution.object_path, 60);

    if (signedError || !signed?.signedUrl) {
      console.error("Private media signing failed", { code: signedError?.name });
      return jsonResponse({ error: "MEDIA_UNAVAILABLE" }, 502, requestOrigin);
    }

    const upstreamHeaders = new Headers();
    const range = request.headers.get("range");
    if (range) {
      upstreamHeaders.set("Range", range);
    }

    const upstream = await fetch(signed.signedUrl, {
      method: request.method === "HEAD" ? "HEAD" : "GET",
      headers: upstreamHeaders,
      redirect: "error",
    });

    if (!upstream.ok && upstream.status !== 206) {
      return jsonResponse({ error: "MEDIA_UNAVAILABLE" }, upstream.status, requestOrigin);
    }

    const headers = new Headers({
      "Access-Control-Allow-Origin": requestOrigin,
      "Accept-Ranges": upstream.headers.get("accept-ranges") ?? "bytes",
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Type": resolution.mime_type ?? upstream.headers.get("content-type") ?? "application/octet-stream",
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
      Vary: "Origin, Range",
    });

    for (const name of ["content-length", "content-range", "etag", "last-modified"]) {
      const value = upstream.headers.get(name);
      if (value) {
        headers.set(name, value);
      }
    }

    return new Response(request.method === "HEAD" ? null : upstream.body, {
      status: upstream.status,
      headers,
    });
  } catch (error: unknown) {
    console.error("Playback gateway error", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return jsonResponse({ error: "PLAYBACK_GATEWAY_ERROR" }, 500, requestOrigin);
  }
});

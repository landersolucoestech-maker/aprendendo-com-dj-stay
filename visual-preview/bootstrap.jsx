import { SURFACES } from "./surfaces.js";

const prefix = "/aprendendo-com-dj-stay/visual-preview/";
const pathname = window.location.pathname;
const slug = pathname.startsWith(prefix)
  ? pathname.slice(prefix.length).replace(/\/+$/, "")
  : "public/home";
const surface = SURFACES.find((item) => item.slug === slug) ?? SURFACES[0];
globalThis.__VISUAL_PREVIEW_ONLY__ = Object.freeze({ slug, surface });

const UUID_USER = "00000000-0000-4000-8000-000000000001";
const now = "2026-08-08T12:00:00.000Z";

const affiliateFixture = () => {
  const mode = surface.slug.split("/")[1];
  const profileStatus =
    mode === "pending" ? "pending" :
    mode === "suspended" ? "suspended" :
    mode === "no-profile" ? null : "active";
  const profile = profileStatus === null ? null : {
    user_id: UUID_USER,
    code: "preview1234",
    status: profileStatus,
    display_name: "Afiliado Preview",
    created_by_user_id: null,
    activated_by_user_id: profileStatus === "pending" ? null : UUID_USER,
    activated_at: profileStatus === "pending" ? null : now,
    suspended_at: profileStatus === "suspended" ? now : null,
    suspension_reason: profileStatus === "suspended" ? "Suspensão VISUAL_PREVIEW_ONLY" : null,
    created_at: now,
    updated_at: now,
  };
  const active = profileStatus === "active";
  const offer = {
    subject_type: "course",
    subject_id: "11111111-1111-4111-8111-111111111111",
    title: "Curso Preview",
    slug: "curso-preview",
    commission_bps: 1000,
    attribution_window_days: 30,
    link_id: mode === "offers" ? null : "44444444-4444-4444-8444-444444444444",
    link_code: mode === "offers" ? null : "previewlink01",
    destination_path: mode === "offers" ? null : "/cursos",
    link_status: mode === "offers" ? null : "active",
  };
  const links = active && ["links","performance","active"].includes(mode) ? [{
    id: "44444444-4444-4444-8444-444444444444",
    subject_type: "course",
    subject_id: offer.subject_id,
    code: "previewlink01",
    status: "active",
    destination_path: "/cursos",
    created_at: now,
    clicks: 42,
    conversions: 7,
    commission_cents: 18900,
  }] : [];
  const commissions = active && ["commissions","active"].includes(mode) ? [{
    id: "55555555-5555-4555-8555-555555555555",
    order_id: "66666666-6666-4666-8666-666666666666",
    title: "Curso Preview",
    basis_amount_cents: 19900,
    commission_bps: 1000,
    commission_amount_cents: 1990,
    status: "available",
    created_at: now,
    available_at: now,
    paid_at: null,
  }] : [];
  const payouts = active && ["payouts","active"].includes(mode) ? [{
    id: "77777777-7777-4777-8777-777777777777",
    status: "paid",
    amount_cents: 1990,
    external_reference: "PIX-PREVIEW-001",
    notes: "VISUAL_PREVIEW_ONLY",
    paid_at: now,
    created_at: now,
  }] : [];
  const events = active && ["events","active"].includes(mode) ? [{
    id: "88888888-8888-4888-8888-888888888888",
    event_type: "conversion_created",
    details: { preview: true },
    created_at: now,
  }] : [];
  const offers = active ? [offer] : [];
  return {
    profile,
    summary: { clicks: 42, conversions: 7, gross_sales_cents: 139300, available_cents: 1990, held_cents: 0, paid_cents: 1990, reversed_cents: 0 },
    offers, links, commissions, payouts, events,
    totals: { offers: offers.length, links: links.length, commissions: commissions.length, payouts: payouts.length, events: events.length },
  };
};

const studentSummary = {
  total: 0, active_total: 0, active_enrollments: [], enrollments: [],
  started_lessons: 0, completed_lessons: 0, average_progress_percent: 0,
  items: [], rows: [], courses: [], modules: [], lessons: [], materials: [],
};

const rpcFixture = (name) => {
  if (name === "get_affiliate_portal") return affiliateFixture();
  if (name.includes("student_course_access")) return { total: 0, active_total: 0, active_enrollments: [], enrollments: [] };
  if (name.includes("student_progress_summary")) return { started_lessons: 0, completed_lessons: 0, average_progress_percent: 0 };
  if (name.includes("student_library_summary")) return { total: 0 };
  if (name.includes("recent_activities")) return [];
  if (name.includes("public_course_catalog")) return [];
  return studentSummary;
};

const jsonResponse = (data, status = 200, extra = {}) =>
  Promise.resolve(new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "content-range": "0-0/0", ...extra },
  }));

globalThis.__nativePreviewFetch = globalThis.fetch.bind(globalThis);

globalThis.fetch = async (input, init = {}) => {
  const url = new URL(typeof input === "string" ? input : input.url, window.location.href);
  if (url.origin === window.location.origin) {
    return globalThis.__nativePreviewFetch(input, init);
  }
  if (url.pathname.includes("/rest/v1/rpc/")) {
    return jsonResponse(rpcFixture(url.pathname.split("/").pop()));
  }
  if (url.pathname.includes("/rest/v1/user_roles")) {
    return jsonResponse({
      user_id: UUID_USER,
      role: surface.area === "admin" ? "administrador_proprietario" : surface.area === "affiliate" ? "afiliado" : "aluno",
      created_at: now, updated_at: now,
    });
  }
  if (url.pathname.includes("/rest/v1/")) {
    const requestHeaders = typeof input === "string" ? init.headers : (init.headers || input.headers);
    const accept = String(new Headers(requestHeaders || {}).get("accept") || "");
    if (accept.includes("application/vnd.pgrst.object")) return jsonResponse({});
    return jsonResponse([]);
  }
  if (url.pathname.includes("/auth/v1/user")) {
    return jsonResponse({ id: UUID_USER, email: "preview@dica.local", user_metadata: { full_name: "Preview Dica de Cria" } });
  }
  if (url.pathname.includes("/storage/v1/")) return jsonResponse({ signedURL: "data:text/plain,preview" });
  if (url.pathname.includes("/functions/v1/")) return jsonResponse({});
  throw new Error("VISUAL_PREVIEW_ONLY blocked external request: " + url.href);
};

import("./app.jsx");

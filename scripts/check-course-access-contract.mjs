import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};
const extractSection = (source, startMarker, endMarker) => {
  const start = source.indexOf(startMarker);
  if (start < 0) return { content: "", hasStart: false, hasEnd: false };

  const end = source.indexOf(endMarker, start + startMarker.length);
  if (end <= start) return { content: "", hasStart: true, hasEnd: false };

  return {
    content: source.slice(start, end),
    hasStart: true,
    hasEnd: true,
  };
};

const app = read("src/App.tsx");
const paymentSuccess = read("src/pages/PaymentSuccess.tsx");
const lesson = read("src/pages/Lesson.tsx");
const player = read("src/components/VideoPlayer.tsx");
const externalMedia = read("src/components/ExternalLessonMedia.tsx");
const lessonsHook = read("src/hooks/useLessons.ts");
const modulesHook = read("src/hooks/useModules.ts");
const playbackHook = read("src/hooks/useLessonPlayback.ts");
const edgeFunction = read("supabase/functions/media-playback/index.ts");
const supabaseConfig = read("supabase/config.toml");
const migrations = [
  "20260730200000_course_access_schema.sql",
  "20260730200100_course_access_rpcs.sql",
  "20260730200200_course_content_access.sql",
  "20260730200300_lesson_media.sql",
  "20260730200400_playback_schema.sql",
  "20260730200500_playback_rpcs.sql",
  "20260730200600_fix_playback_token_ambiguity.sql",
  "20260730200700_harden_playback_issue_pgcrypto.sql",
  "20260730200800_harden_playback_resolution_pgcrypto.sql",
].map((name) => read(`supabase/migrations/${name}`)).join("\n");

const paymentRouteSection = extractSection(
  app,
  'path="/pagamento-sucesso"',
  'path="/login"',
);
const paymentRoute = paymentRouteSection.content;
const paymentAllowedRoles =
  /allowedRoles\s*=\s*\{\s*\[\s*"aluno"\s*,\s*"administrador_proprietario"\s*\]\s*\}/;

expect(migrations.includes("private.has_active_course_access"), "A autorização de curso deve ser resolvida no banco.");
expect(migrations.includes("SERVICE_ROLE_REQUIRED"), "A confirmação de compra deve exigir service_role.");
expect(migrations.includes("request_lesson_playback_token"), "A reprodução deve exigir token curto e opaco.");
expect(migrations.includes("ACTIVE_ENROLLMENT_REQUIRED"), "A mídia deve exigir matrícula ativa.");
expect(migrations.includes("extensions.gen_random_bytes"), "Tokens devem usar pgcrypto com schema explícito.");
expect(migrations.includes("extensions.digest"), "Hashes devem usar pgcrypto com schema explícito.");
expect(!app.includes("VITE_DISABLE_AUTH"), "Bypass de autenticação não pode existir.");
expect(paymentRouteSection.hasStart, "A rota de confirmação de pagamento deve existir.");
expect(paymentRouteSection.hasEnd, "A rota de confirmação de pagamento deve possuir limite estrutural verificável.");
expect(paymentRoute.includes("<RequireAuth>"), "A confirmação de pagamento deve exigir autenticação.");
expect(paymentAllowedRoles.test(paymentRoute), "A confirmação de pagamento deve permitir somente aluno e administrador proprietário.");
expect(paymentRoute.includes("<PaymentSuccess />"), "A rota protegida deve renderizar a confirmação de pagamento.");
expect(paymentRoute.includes("</RequireRole>") && paymentRoute.includes("</RequireAuth>"), "Os guards da confirmação de pagamento devem permanecer fechados no bloco da rota.");
expect(!paymentSuccess.includes("Pagamento Realizado!"), "A página de retorno não pode declarar pagamento sem confirmação confiável.");
expect(!paymentSuccess.includes("Acesso vitalício"), "A interface não pode inventar prazo vitalício.");
expect(!lesson.includes("getPublicUrl("), "A página de aula não pode gerar URL pública.");
expect(!player.includes("getPublicUrl("), "O player não pode gerar URL pública.");
expect(!player.includes("youtube.com/watch"), "O player não pode interpretar URL arbitrária de vídeo.");
expect(player.includes("useLessonPlayback"), "O player deve depender do token de reprodução.");
expect(externalMedia.includes('sandbox="allow-scripts allow-same-origin allow-presentation"'), "Embed externo deve usar sandbox restritivo.");
expect(externalMedia.includes('referrerPolicy="no-referrer"'), "Embed externo não deve enviar referrer.");
expect(externalMedia.includes("event.source !== iframeRef.current?.contentWindow"), "Eventos externos devem pertencer ao iframe autorizado.");
expect(!lessonsHook.includes("video"), "A consulta de aulas não pode depender da coluna de vídeo removida.");
expect(!modulesHook.includes("video"), "A consulta de módulos não pode depender da coluna de vídeo removida.");
expect(playbackHook.includes("request_lesson_playback_token"), "O frontend deve solicitar token pelo RPC controlado.");
expect(edgeFunction.includes("resolve_lesson_playback_token"), "A Edge Function deve resolver tokens somente no backend.");
expect(edgeFunction.includes("createSignedUrl"), "O streaming privado deve assinar o objeto apenas dentro da Edge Function.");
expect(edgeFunction.includes("ORIGIN_NOT_ALLOWED"), "A Edge Function deve bloquear hotlink por origem.");
expect(supabaseConfig.includes("[functions.media-playback]"), "A função de mídia deve possuir configuração explícita.");
expect(supabaseConfig.includes("verify_jwt = false"), "A função de mídia usa token próprio e deve validar a credencial dentro do handler.");

if (failures.length > 0) {
  console.error("Contrato B10 inválido:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log("Contrato estático da FASE B10 aprovado.");

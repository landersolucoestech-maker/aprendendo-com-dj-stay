import { existsSync, readFileSync, readdirSync } from "node:fs";

const paths = {
  contracts: "src/contracts/playback.ts",
  tests: "src/contracts/playback.test.ts",
  edgeTests: "src/contracts/playback-edge.test.ts",
  sharedParser: "supabase/functions/_shared/playback-contract.ts",
  gateway: "supabase/functions/media-playback/index.ts",
  hook: "src/hooks/useLessonPlayback.ts",
  documentation: "docs/refactor/FASE-B77-PLAYBACK-CONTRACT-TESTS.md",
  package: "package.json",
};

const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

for (const path of Object.values(paths)) {
  expect(existsSync(path), `${path} deve existir.`);
}
expect(existsSync("supabase/migrations"), "supabase/migrations deve existir.");

const read = (path) => (existsSync(path) ? readFileSync(path, "utf8") : "");
const contracts = read(paths.contracts);
const tests = read(paths.tests);
const edgeTests = read(paths.edgeTests);
const sharedParser = read(paths.sharedParser);
const gateway = read(paths.gateway);
const hook = read(paths.hook);
const documentation = read(paths.documentation);
const packageJson = existsSync(paths.package)
  ? JSON.parse(read(paths.package))
  : { scripts: {} };
const migrations = existsSync("supabase/migrations")
  ? readdirSync("supabase/migrations")
      .filter((name) => name.endsWith(".sql"))
      .map((name) => read(`supabase/migrations/${name}`))
      .join("\n")
  : "";

for (const fragment of [
  "playbackTokenSchema",
  "playbackFingerprintSchema",
  "playbackDenialReasonSchema",
  "playbackGatewayErrorCodeSchema",
  "playbackCredentialsSchema",
  "playbackTokenResultSchema",
  'z.discriminatedUnion("granted"',
  ".length(1)",
  "privatePlaybackStreamUrlSchema",
  "/functions/v1/media-playback",
  "www.youtube-nocookie.com",
  "player.vimeo.com",
  'z.discriminatedUnion("provider"',
  "playbackGatewayErrorSchema",
  ".strict()",
]) {
  expect(contracts.includes(fragment), `Contrato B77 ausente: ${fragment}`);
}

for (const fragment of [
  "PLAYBACK_PROVIDERS",
  "PLAYBACK_DENIAL_REASONS",
  "PlaybackResolution",
  "hasExactKeys",
  "isTimestamp",
  "isYoutubeEmbedUrl",
  "isVimeoEmbedUrl",
  "parsePlaybackResolution",
  'value.provider === "private_asset"',
  "value.bucket_id !== null",
  "value.object_path !== null",
  "value.mime_type !== null",
]) {
  expect(sharedParser.includes(fragment), `Parser B77 ausente: ${fragment}`);
}

for (const fragment of [
  'from "../_shared/playback-contract.ts"',
  "parsePlaybackResolution(Array.isArray(data) ? data[0] : data)",
  "Playback resolver returned an invalid contract",
  'rpc("resolve_lesson_playback_token"',
  "TOKEN_PATTERN",
  "FINGERPRINT_PATTERN",
]) {
  expect(gateway.includes(fragment), `Gateway B77 ausente: ${fragment}`);
}
expect(
  !gateway.includes("as PlaybackResolution"),
  "A Edge Function não pode restaurar o cast não validado da resolução.",
);

for (const fragment of [
  "playbackCredentialsSchema",
  "playbackFingerprintSchema",
  "playbackGatewayResponseSchema",
  "playbackTokenResponseSchema",
  "playbackTokenSchema",
  'rpc("request_lesson_playback_token"',
  'functions.invoke("media-playback"',
  'rpc("revoke_lesson_playback_token"',
  "if (!issued.granted)",
]) {
  expect(hook.includes(fragment), `Consumidor B77 ausente: ${fragment}`);
}
expect(
  (hook.match(/parseDataContract\(/g) ?? []).length >= 6,
  "O hook B77 deve validar identificador, fingerprint, credenciais, emissão, gateway e revogação.",
);

for (const fragment of [
  "aceita token e fingerprint hexadecimais canônicos",
  "rejeita comprimentos, caixa alta e campos extras",
  "aceita exatamente uma emissão concedida",
  "aceita exatamente uma emissão negada",
  "rejeita resposta vazia ou com múltiplas linhas",
  "rejeita concessão com motivo e negação com dados concedidos",
  "aceita gateway privado com stream assinado pelo gateway",
  "aceita embeds oficiais do YouTube e Vimeo",
  "rejeita URL ou canal incompatível com o provedor",
  "aceita erros canônicos do gateway",
  "safeParse",
]) {
  expect(tests.includes(fragment), `Cobertura frontend B77 ausente: ${fragment}`);
}
expect(
  !tests.includes("@/hooks/useLessonPlayback") &&
    !tests.includes("@/integrations/supabase") &&
    !tests.includes("@/config/public-config"),
  "A suíte frontend B77 deve permanecer independente do hook, Supabase e configuração pública.",
);

for (const fragment of [
  "parsePlaybackResolution",
  "aceita resolução privada completa",
  "aceita resoluções externas oficiais",
  "aceita negação canônica com metadados residuais permitidos",
  "rejeita objeto incompleto, array e campo extra",
  "rejeita mídia privada sem bucket, objeto ou MIME",
  "rejeita provedor externo com armazenamento privado ou embed incompatível",
  "rejeita negação com motivo livre ou dados de mídia",
]) {
  expect(edgeTests.includes(fragment), `Cobertura Edge B77 ausente: ${fragment}`);
}

for (const fragment of [
  "lesson_media_provider",
  "playback_event_type",
  "request_lesson_playback_token",
  "resolve_lesson_playback_token",
  "revoke_lesson_playback_token",
  "AUTH_SESSION_REQUIRED",
  "ACTIVE_ENROLLMENT_REQUIRED",
  "INVALID_PLAYBACK_CREDENTIALS",
  "TOKEN_NOT_FOUND",
  "FINGERPRINT_MISMATCH",
  "TOKEN_REVOKED",
  "TOKEN_EXPIRED",
  "MEDIA_DISABLED",
  "ENROLLMENT_NOT_ACTIVE",
  "ADMIN_ROLE_REMOVED",
]) {
  expect(migrations.includes(fragment), `Migration/RPC B77 ausente: ${fragment}`);
}

expect(
  documentation.includes("Fase B77") &&
    documentation.includes("Nenhuma migration") &&
    documentation.includes("Nenhum deploy") &&
    documentation.includes("Supabase remoto"),
  "Documentação B77 deve registrar escopo e exclusões.",
);
expect(
  packageJson.scripts?.["check:playback-contract-tests"] ===
    "node scripts/check-playback-contract-tests.mjs",
  "package.json deve expor check:playback-contract-tests.",
);
expect(
  packageJson.scripts?.typecheck?.includes("npm run check:playback-contract-tests"),
  "Contrato B77 deve estar encadeado ao typecheck.",
);

if (failures.length > 0) {
  console.error("Falhas no contrato B77:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(
  "Contrato B77 aprovado: emissão, resolução, URLs por provedor, parser Edge e revogação possuem validação estrita e cobertura determinística.",
);

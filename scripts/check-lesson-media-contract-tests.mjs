import { existsSync, readFileSync } from "node:fs";

const paths = {
  contracts: "src/contracts/curriculum-cms.ts",
  tests: "src/contracts/lesson-media.test.ts",
  legacyTests: "src/contracts/curriculum-cms.test.ts",
  hook: "src/hooks/useCurriculumCms.ts",
  migration: "supabase/migrations/20260730200300_lesson_media.sql",
  documentation: "docs/refactor/FASE-B78-LESSON-MEDIA-CONTRACT-TESTS.md",
  package: "package.json",
};

const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

for (const path of Object.values(paths)) {
  expect(existsSync(path), `${path} deve existir.`);
}

const read = (path) => (existsSync(path) ? readFileSync(path, "utf8") : "");
const contracts = read(paths.contracts);
const tests = read(paths.tests);
const legacyTests = read(paths.legacyTests);
const hook = read(paths.hook);
const migration = read(paths.migration);
const documentation = read(paths.documentation);
const packageJson = existsSync(paths.package)
  ? JSON.parse(read(paths.package))
  : { scripts: {} };

for (const fragment of [
  "youtubeVideoIdSchema",
  "/^[A-Za-z0-9_-]{11}$/",
  "vimeoVideoIdSchema",
  "/^[0-9]{6,12}$/",
  "externalMediaSourceUrlSchema",
  ".max(1000)",
  "youtubeSourceUrlPatterns",
  "vimeoSourceUrlPatterns",
  "externalLessonMediaInputSchema",
  'z.discriminatedUnion("provider"',
  "privateLessonMediaInputSchema",
  "disableLessonMediaInputSchema",
  "Identificador persistido do YouTube inválido.",
  "Identificador persistido do Vimeo inválido.",
  ".strict()",
]) {
  expect(contracts.includes(fragment), `Contrato B78 ausente: ${fragment}`);
}

for (const fragment of [
  "identificadores persistidos de mídia",
  "aceita identificador canônico do YouTube e Vimeo",
  "rejeita tamanho, caracteres e formato incompatíveis",
  "aceita mídia privada, YouTube e Vimeo coerentes",
  "rejeita identificador externo incompatível com o provedor",
  "preserva coerência entre asset privado e identificador externo",
  "aceita URL suportada do YouTube",
  "aceita URL suportada do Vimeo",
  "rejeita provedor incompatível com a URL",
  "rejeita HTTP, identificador inválido, limite, UUID e campos extras",
  "aceita entrada privada e desativação canônicas",
  "rejeita UUIDs inválidos e campos extras",
  "safeParse",
]) {
  expect(tests.includes(fragment), `Cobertura B78 ausente: ${fragment}`);
}
expect(
  !tests.includes("@/hooks/useCurriculumCms") &&
    !tests.includes("@/integrations/supabase") &&
    !tests.includes("@/config/public-config"),
  "A suíte B78 deve permanecer independente do hook, Supabase e configuração pública.",
);
expect(
  legacyTests.includes('external_video_id: "AbCdEf123_-"'),
  "A suíte legada do currículo deve usar identificador canônico do YouTube.",
);
expect(
  !legacyTests.includes(
    'provider: "youtube",\n        asset_id: null,\n        external_video_id: "video-123",',
  ),
  "A suíte legada não pode restaurar video-123 como identificador positivo do YouTube.",
);

for (const fragment of [
  "disableLessonMediaInputSchema",
  "externalLessonMediaInputSchema",
  "privateLessonMediaInputSchema",
  'rpc("upsert_external_lesson_media"',
  'rpc("upsert_private_lesson_media"',
  'rpc("disable_lesson_media"',
  "entrada da mídia externa da aula",
  "entrada da mídia privada da aula",
  "entrada da desativação da mídia da aula",
  "p_lesson_id: input.lessonId",
  "p_provider: input.provider",
  "p_source_url: input.sourceUrl",
  "p_asset_id: input.assetId",
  "lessonMediaRowSchema",
  "z.boolean()",
]) {
  expect(hook.includes(fragment), `Consumidor B78 ausente: ${fragment}`);
}

for (const fragment of [
  "lesson_media_source_exactly_one",
  "lesson_media_external_id_format",
  "private.youtube_video_id",
  "private.vimeo_video_id",
  "char_length(p_url) > 1000",
  "^[A-Za-z0-9_-]{11}$",
  "^[0-9]{6,12}$",
  "upsert_external_lesson_media",
  "upsert_private_lesson_media",
  "disable_lesson_media",
  "INVALID_EXTERNAL_MEDIA_URL",
  "EXTERNAL_PROVIDER_REQUIRED",
  "PUBLISHED_LESSON_VIDEO_REQUIRED",
]) {
  expect(migration.includes(fragment), `Constraint/RPC B78 ausente: ${fragment}`);
}

expect(
  documentation.includes("Fase B78") &&
    documentation.includes("Nenhuma migration") &&
    documentation.includes("Nenhum deploy") &&
    documentation.includes("Supabase remoto"),
  "Documentação B78 deve registrar escopo e exclusões.",
);
expect(
  packageJson.scripts?.["check:lesson-media-contract-tests"] ===
    "node scripts/check-lesson-media-contract-tests.mjs",
  "package.json deve expor check:lesson-media-contract-tests.",
);
expect(
  packageJson.scripts?.typecheck?.includes("npm run check:lesson-media-contract-tests"),
  "Contrato B78 deve estar encadeado ao typecheck.",
);

if (failures.length > 0) {
  console.error("Falhas no contrato B78:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(
  "Contrato B78 aprovado: IDs persistidos, URLs por provedor, fixture legado e mutações administrativas de mídia possuem validação estrita alinhada ao PostgreSQL.",
);

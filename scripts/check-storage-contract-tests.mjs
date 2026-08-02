import { existsSync, readFileSync } from "node:fs";

const paths = {
  contracts: "src/contracts/storage.ts",
  tests: "src/contracts/storage.test.ts",
  avatarHook: "src/hooks/useAvatarUpload.ts",
  lessonFiles: "src/hooks/useLessonFiles.ts",
  privateAssets: "src/lib/private-assets.ts",
  schema: "supabase/migrations/20260730170000_private_asset_schema.sql",
  uploadRpcs: "supabase/migrations/20260730170100_private_asset_upload_rpcs.sql",
  stateRpcs: "supabase/migrations/20260730170200_private_asset_state_rpcs.sql",
  grantRpcs: "supabase/migrations/20260730170300_private_asset_grant_rpcs.sql",
  documentation: "docs/refactor/FASE-B75-STORAGE-CONTRACT-TESTS.md",
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
const avatarHook = read(paths.avatarHook);
const lessonFiles = read(paths.lessonFiles);
const privateAssets = read(paths.privateAssets);
const database = [paths.schema, paths.uploadRpcs, paths.stateRpcs, paths.grantRpcs]
  .map(read)
  .join("\n");
const documentation = read(paths.documentation);
const packageJson = existsSync(paths.package)
  ? JSON.parse(read(paths.package))
  : { scripts: {} };

for (const fragment of [
  "assetEventTypeSchema",
  "assetTypePolicy",
  "includesText",
  "O tamanho excede o limite do propósito do asset.",
  "O caminho deve reproduzir owner, asset e extensão.",
  "Avatar deve pertencer ao criador e não pode estar ligado a aula.",
  "Somente asset falho pode estar removido logicamente.",
  "O lifecycle do asset está incoerente.",
  "assetEventSchema",
  "assetAccessGrantSchema",
  "A expiração do grant deve ocorrer após a criação.",
  "A URL assinada deve utilizar HTTPS.",
  "5 * 1024 * 1024",
  ".strict()",
]) {
  expect(contracts.includes(fragment), `Contrato B75 ausente: ${fragment}`);
}

const purposes = [
  "avatar",
  "video",
  "audio",
  "image",
  "document",
  "sample",
  "preset",
  "stem",
  "project",
  "archive",
  "template",
  "support_file",
  "digital_product",
];
for (const purpose of purposes) {
  expect(
    contracts.includes(`${purpose}: {`),
    `Política B75 ausente para o propósito ${purpose}.`,
  );
  expect(
    tests.includes(`["${purpose}",`),
    `Caso unitário B75 ausente para o propósito ${purpose}.`,
  );
}

for (const fragment of [
  "assets_bucket_private",
  "assets_original_name_length",
  "assets_extension_format",
  "assets_mime_type_format",
  "assets_size_positive",
  "assets_checksum_format",
  "assets_idempotency_format",
  "assets_avatar_scope",
  "asset_event_type",
  "asset_access_grants_future_expiry",
  "private.asset_max_size_bytes",
  "private.asset_type_allowed",
  "prepare_asset_upload",
  "confirm_asset_upload",
  "transition_asset_state",
  "fail_asset_upload",
  "grant_asset_access",
  "revoke_asset_access",
  "INVALID_FILE_NAME",
  "FILE_SIZE_NOT_ALLOWED",
  "FILE_TYPE_NOT_ALLOWED",
  "INVALID_IDEMPOTENCY_KEY",
  "INVALID_AVATAR_SCOPE",
  "INVALID_PROCESSING_TRANSITION",
  "INVALID_PUBLISH_TRANSITION",
  "INVALID_FAILURE_REASON",
  "INVALID_GRANT_EXPIRY",
]) {
  expect(database.includes(fragment), `Constraint/RPC B75 ausente: ${fragment}`);
}

for (const fragment of [
  "aceita todos os propósitos com extensão, MIME e limite próprios",
  "rejeita extensão e MIME incompatíveis com o propósito",
  "rejeita tamanho acima do limite específico mesmo abaixo do máximo global",
  "rejeita caminho que não reproduz owner, id e extensão",
  "rejeita avatar ligado a aula ou criado para outro proprietário",
  "aceita lifecycle pending, uploaded, processing e published coerentes",
  "aceita falha em qualquer etapa anterior e avatar substituído",
  "rejeita timestamps, motivo e remoção incompatíveis com o estado",
  "rejeita nome, MIME, idempotência, checksum e metadata inválidos",
  "aceita evento canônico e coleção de eventos",
  "aceita grant permanente, temporário e coleção",
  "rejeita expiração anterior ou igual à criação",
  "aceita somente URL HTTPS válida",
  "aceita JPEG, PNG e WebP não vazios",
  "rejeita tipo, arquivo vazio, tamanho e nome inválidos",
  "safeParse",
]) {
  expect(tests.includes(fragment), `Cobertura B75 ausente: ${fragment}`);
}

for (const fragment of [
  "avatarFileSchema",
  "assetRowSchema",
  "assetRowsSchema",
  "prepare_asset_upload",
  "confirm_asset_upload",
  "transition_asset_state",
  "fail_asset_upload",
  "parseDataContract",
]) {
  expect(avatarHook.includes(fragment), `Consumidor de avatar B75 ausente: ${fragment}`);
}
const avatarValidationCount = avatarHook.match(/parseDataContract\(/g)?.length ?? 0;
expect(
  avatarValidationCount >= 4,
  `Fluxo de avatar deve manter quatro validações de contrato; encontradas ${avatarValidationCount}.`,
);
expect(
  lessonFiles.includes("lessonIdSchema") &&
    lessonFiles.includes("assetRowsSchema") &&
    lessonFiles.includes("parseDataContract"),
  "Listagem de arquivos da aula deve validar aula e assets publicados.",
);
expect(
  privateAssets.includes("signedAssetUrlSchema") &&
    privateAssets.includes("asset.state !== \"published\"") &&
    privateAssets.includes("asset.deleted_at !== null") &&
    privateAssets.includes("credentials: \"omit\"") &&
    privateAssets.includes("cache: \"no-store\""),
  "Download privado deve exigir asset publicado, URL validada e fetch sem credenciais/cache.",
);
expect(
  documentation.includes("Fase B75") &&
    documentation.includes("Nenhuma migration") &&
    documentation.includes("Supabase remoto"),
  "Documentação B75 deve registrar escopo e exclusões.",
);
expect(
  packageJson.scripts?.["check:storage-contract-tests"] ===
    "node scripts/check-storage-contract-tests.mjs",
  "package.json deve expor check:storage-contract-tests.",
);
expect(
  packageJson.scripts?.typecheck?.includes("npm run check:storage-contract-tests"),
  "Contrato B75 deve estar encadeado ao typecheck.",
);

if (failures.length > 0) {
  console.error("Falhas no contrato B75:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(
  "Contrato B75 aprovado: assets, eventos, grants e consumidores de Storage reproduzem as regras persistidas com cobertura unitária estrita.",
);

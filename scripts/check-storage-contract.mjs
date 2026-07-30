import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const failures = [];

const walk = (directory) => {
  const absolute = new URL(directory, root);
  return readdirSync(absolute).flatMap((entry) => {
    const path = join(directory, entry);
    const value = new URL(path, root);
    return statSync(value).isDirectory() ? walk(`${path}/`) : [path];
  });
};

const sourceFiles = walk("src/").filter((path) => /\.(ts|tsx)$/.test(path));
const forbidden = [
  "getPublicUrl",
  "lesson-samples",
  "lesson-projects",
  '.from("lesson_files")',
  ".from('lesson_files')",
  "avatar_url",
  "samples_file_path",
  "project_file_path",
];

for (const path of sourceFiles) {
  const content = read(path);
  for (const token of forbidden) {
    if (content.includes(token)) {
      failures.push(`${path}: contrato legado ou público encontrado: ${token}`);
    }
  }
}

const requireText = (path, token) => {
  if (!read(path).includes(token)) {
    failures.push(`${path}: conteúdo obrigatório ausente: ${token}`);
  }
};

for (const token of [
  "prepare_asset_upload",
  "confirm_asset_upload",
  "transition_asset_state",
]) {
  requireText("src/hooks/useAvatarUpload.ts", token);
}
requireText("src/hooks/useAvatarUpload.ts", '.from(preparedAsset.bucket_id)');
requireText("src/hooks/useLessonFiles.ts", '.from("assets")');
requireText("src/lib/private-assets.ts", "createSignedUrl");
requireText("src/lib/private-assets.ts", "downloadPrivateAsset");
requireText("src/contracts/storage.ts", 'z.literal("private-assets")');
requireText("supabase/migrations/20260730170000_private_asset_schema.sql", "create table public.asset_access_grants");
requireText("supabase/migrations/20260730170400_private_asset_storage.sql", "false,\n  5368709120");
requireText("supabase/migrations/20260730170400_private_asset_storage.sql", "create policy private_assets_select");

if (failures.length > 0) {
  console.error("Contrato de Storage inválido:\n" + failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Contrato estático de Storage validado.");

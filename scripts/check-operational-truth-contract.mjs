import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const read = (relativePath) => readFile(path.join(root, relativePath), "utf8");

const requiredFiles = [
  "supabase/migrations/20260731061030_contact_messages_schema.sql",
  "supabase/migrations/20260731061040_contact_messages_rpcs.sql",
  "supabase/tests/41_contact_messages_schema.test.sql",
  "supabase/tests/42_contact_messages_lifecycle.test.sql",
  "supabase/tests/43_avatar_persistence.test.sql",
  "src/contracts/contact-messages.ts",
  "src/hooks/useContactMessages.ts",
  "src/hooks/useAvatarUpload.ts",
  "src/pages/Contact.tsx",
  "src/pages/admin/ContactsAdmin.tsx",
  "src/App.tsx",
];

const contents = new Map(
  await Promise.all(requiredFiles.map(async (file) => [file, await read(file)])),
);

const fail = (message) => {
  console.error(`FASE B22 bloqueada: ${message}`);
  process.exitCode = 1;
};

const requireText = (file, fragments) => {
  const content = contents.get(file) ?? "";
  for (const fragment of fragments) {
    if (!content.includes(fragment)) fail(`${file} não contém ${fragment}`);
  }
};

requireText("supabase/migrations/20260731061030_contact_messages_schema.sql", [
  "create table public.contact_messages",
  "create table public.contact_message_events",
  "idempotency_key uuid not null unique",
  "force row level security",
  "revoke all on public.contact_messages from public, anon, authenticated",
]);
requireText("supabase/migrations/20260731061040_contact_messages_rpcs.sql", [
  "CONTACT_IDEMPOTENCY_CONFLICT",
  "CONTACT_RESOLUTION_NOTE_REQUIRED",
  "insert into public.contact_messages",
  "insert into public.contact_message_events",
  "'persisted', true",
  "security invoker",
]);
requireText("src/pages/Contact.tsx", [
  "useSubmitContactMessage()",
  "Solicitação registrada",
  "confirmation.reference_code",
  "await submitContact.mutateAsync",
]);
requireText("src/pages/admin/ContactsAdmin.tsx", [
  "useContactMessagesAdmin",
  "useUpdateContactMessageStatus",
  "Solicitações de contato",
  "Nota de tratamento",
]);
requireText("src/hooks/useAvatarUpload.ts", [
  "verifyPersistedAvatarBinding",
  '.from("user_profiles")',
  '.select("avatar_asset_id")',
  "AVATAR_PROFILE_BINDING_NOT_CONFIRMED",
  "await verifyPersistedAvatarBinding(publishedAsset.id)",
]);
requireText("src/App.tsx", [
  'path="/contato"',
  'path="/admin/contatos"',
  "<ContactsAdmin />",
  "<AdminRoute>",
]);

const contactSource = contents.get("src/pages/Contact.tsx") ?? "";
const bannedContactFragments = [
  "setTimeout",
  "Mensagem enviada!",
  "contato@producaodefunk.com",
  "(11) 99999-9999",
  "São Paulo, SP",
  "das 9h às 18h",
  "até 24 horas",
  "disponível sempre",
];
for (const fragment of bannedContactFragments) {
  if (contactSource.includes(fragment)) {
    fail(`src/pages/Contact.tsx ainda contém alegação ou simulação não comprovada: ${fragment}`);
  }
}

const rpcMigration = (
  contents.get("supabase/migrations/20260731061040_contact_messages_rpcs.sql") ?? ""
).toLowerCase();
const publicContactFunctions = rpcMigration
  .split(/(?=create function public\.)/g)
  .filter((block) => block.startsWith("create function public.") && block.includes("contact"));
if (publicContactFunctions.some((block) => block.includes("security definer"))) {
  fail("RPC pública de contato não pode usar SECURITY DEFINER");
}

const avatarSource = contents.get("src/hooks/useAvatarUpload.ts") ?? "";
if (
  avatarSource.indexOf("await verifyPersistedAvatarBinding(publishedAsset.id)") >
  avatarSource.indexOf("return publishedAsset")
) {
  fail("o avatar precisa ser verificado no perfil antes de retornar sucesso");
}

const collectSourceFiles = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectSourceFiles(absolute)));
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(absolute);
  }
  return files;
};

for (const sourceFile of await collectSourceFiles(path.join(root, "src"))) {
  const source = await readFile(sourceFile, "utf8");
  if (/\.from\(["'](?:contact_messages|contact_message_events)["']\)/.test(source)) {
    fail(`${path.relative(root, sourceFile)} acessa tabelas de contato diretamente`);
  }
}

if (process.exitCode) process.exit(process.exitCode);
console.log("Contrato estático da FASE B22 aprovado.");

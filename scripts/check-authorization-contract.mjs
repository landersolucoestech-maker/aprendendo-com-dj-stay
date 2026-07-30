import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const failures = [];

const requireText = (path, expected) => {
  if (!read(path).includes(expected)) {
    failures.push(`${path}: conteúdo obrigatório ausente: ${expected}`);
  }
};

const forbidText = (path, forbidden) => {
  if (read(path).includes(forbidden)) {
    failures.push(`${path}: conteúdo proibido encontrado: ${forbidden}`);
  }
};

const migration = "supabase/migrations/20260730162000_roles_authorization_rls.sql";
for (const role of ["aluno", "afiliado", "administrador_proprietario"]) {
  requireText(migration, `'${role}'`);
}
requireText(migration, "create table public.user_roles");
requireText(migration, "create or replace function private.current_user_role()");
requireText(migration, "create or replace function private.handle_new_user_role()");
requireText(migration, "set search_path = ''");
requireText(migration, "revoke all on tables from anon, authenticated, service_role");
forbidText(migration, "user_metadata");
forbidText(migration, "raw_user_meta_data");

requireText("src/contracts/authorization.ts", "appRoleSchema");
requireText("src/hooks/useCurrentRole.ts", '.from("user_roles")');
requireText("src/routing/RequireRole.tsx", "allowedRoles");
requireText("src/routing/RoleLandingRedirect.tsx", 'role === "afiliado"');
requireText("src/App.tsx", 'path="/portal"');
requireText("src/App.tsx", '<RequireRole allowedRoles={["aluno", "administrador_proprietario"]}>');
requireText("src/App.tsx", '<RequireRole allowedRoles={["aluno", "afiliado", "administrador_proprietario"]}>');

for (const path of [
  "src/pages/Login.tsx",
  "src/pages/Register.tsx",
  "src/pages/AuthCallback.tsx",
  "src/pages/Verified.tsx",
  "src/pages/ResetPassword.tsx",
  "src/routing/PublicOnlyRoute.tsx",
  "src/routing/route-state.ts",
]) {
  forbidText(path, '"/dashboard"');
}

if (failures.length > 0) {
  console.error("Contrato de autorização inválido:\n" + failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Contrato estático de autorização validado.");

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const read = (relativePath) => readFile(path.join(root, relativePath), "utf8");

const requiredFiles = [
  "supabase/migrations/20260731061000_certificates_schema.sql",
  "supabase/migrations/20260731061010_certificates_rpcs.sql",
  "supabase/tests/39_certificates_schema.test.sql",
  "supabase/tests/40_certificates_lifecycle.test.sql",
  "src/contracts/certificates.ts",
  "src/hooks/useCertificates.ts",
  "src/pages/student/Certificates.tsx",
  "src/pages/admin/StudentsAdmin.tsx",
  "src/pages/CertificateValidation.tsx",
  "src/App.tsx",
];

const contents = new Map(
  await Promise.all(requiredFiles.map(async (file) => [file, await read(file)])),
);

const fail = (message) => {
  console.error(`FASE B21 bloqueada: ${message}`);
  process.exitCode = 1;
};

const requireText = (file, fragments) => {
  const content = contents.get(file) ?? "";
  for (const fragment of fragments) {
    if (!content.includes(fragment)) fail(`${file} não contém ${fragment}`);
  }
};

requireText("supabase/migrations/20260731061000_certificates_schema.sql", [
  "create table public.certificates",
  "create table public.certificate_events",
  "certificates_one_issued_per_enrollment_uidx",
  "CERTIFICATE_IDENTITY_IMMUTABLE",
  "force row level security",
  "revoke all on public.certificates from public, anon, authenticated",
]);

requireText("supabase/migrations/20260731061010_certificates_rpcs.sql", [
  "calculate_enrollment_completion",
  "CERTIFICATE_REQUIREMENTS_NOT_MET",
  "extensions.gen_random_bytes",
  "student_name_snapshot",
  "course_title_snapshot",
  "REVOCATION_REASON_INVALID",
  "validate_certificate_code",
  "get_students_admin_dashboard",
  "security invoker",
]);

requireText("src/hooks/useCertificates.ts", [
  'supabase.rpc("get_my_certificates")',
  'supabase.rpc("validate_certificate"',
  'supabase.rpc("get_students_admin_dashboard"',
  'supabase.rpc("grant_course_enrollment"',
  'supabase.rpc("issue_enrollment_certificate"',
  'supabase.rpc("revoke_enrollment_certificate"',
]);

requireText("src/App.tsx", [
  'path="/certificado"',
  'path="/certificado/:code"',
  'path="/aluno/certificados"',
  'path="/admin/alunos"',
  "<StudentRoute>",
  "<AdminRoute>",
]);

requireText("src/pages/CertificateValidation.tsx", [
  "useCertificateValidation(code)",
  "Certificado válido",
  "Certificado revogado",
  "window.print()",
]);

requireText("src/pages/admin/StudentsAdmin.tsx", [
  "Conceder matrícula",
  "Emitir certificado",
  "Revogar certificado",
  "Motivo administrativo",
]);

const migrationText = [
  contents.get("supabase/migrations/20260731061000_certificates_schema.sql") ?? "",
  contents.get("supabase/migrations/20260731061010_certificates_rpcs.sql") ?? "",
].join("\n").toLowerCase();

if (/create policy[\s\S]*\bto anon\b/.test(migrationText)) {
  fail("certificados não podem expor políticas de tabela ao papel anônimo");
}
if (/create function public\.[^(]*certificate[\s\S]*security definer/.test(migrationText)) {
  fail("RPC pública de certificado não pode usar SECURITY DEFINER");
}
if (!migrationText.includes("char_length(v_reason) not between 3 and 1000")) {
  fail("revogação precisa exigir motivo auditável");
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
  if (/\.from\(["'](?:certificates|certificate_events)["']\)/.test(source)) {
    fail(`${path.relative(root, sourceFile)} acessa tabelas de certificados diretamente`);
  }
}

if (process.exitCode) process.exit(process.exitCode);
console.log("Contrato estático da FASE B21 aprovado.");

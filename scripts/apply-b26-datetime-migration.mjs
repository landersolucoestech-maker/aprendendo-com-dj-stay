import { execFileSync } from "node:child_process";
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";

const migrationScriptPath = "scripts/apply-b26-datetime-migration.mjs";

if (process.env.GITHUB_ACTIONS !== "true") {
  console.log("Migração B26 reservada ao runner da branch dev.");
  process.exit(0);
}

if (process.env.GITHUB_REF_NAME !== "dev") {
  throw new Error("A migração B26 só pode executar na branch dev.");
}

const changedFiles = [];

const replaceRequired = (source, pattern, replacement, label) => {
  const next = source.replace(pattern, replacement);
  if (next === source) {
    throw new Error(`Padrão obrigatório não encontrado: ${label}`);
  }
  return next;
};

const addImport = (source, anchor, statement, label) => {
  if (source.includes(statement)) return source;
  return replaceRequired(source, anchor, `${statement}\n${anchor}`, label);
};

const edit = (path, transform) => {
  const current = readFileSync(path, "utf8");
  const next = transform(current);
  if (next === current) {
    throw new Error(`A migração não alterou ${path}.`);
  }
  writeFileSync(path, next);
  changedFiles.push(path);
};

edit("src/components/ConnectionStatus.tsx", (source) => {
  let next = addImport(
    source,
    'import { supabase } from "@/integrations/supabase/client";',
    'import { formatAppTime } from "@/lib/date-time";',
    "import temporal em ConnectionStatus",
  );
  next = replaceRequired(
    next,
    "lastUpdate.toLocaleTimeString('pt-BR')",
    'formatAppTime(lastUpdate, { timeStyle: "medium" })',
    "horário da conexão",
  );
  return next;
});

edit("src/hooks/useRecentActivities.ts", (source) => {
  let next = addImport(
    source,
    'import { supabase } from "@/integrations/supabase/client";',
    'import { formatAppRelativeTime } from "@/lib/date-time";',
    "import temporal em useRecentActivities",
  );
  next = replaceRequired(
    next,
    /const formatRelativeTime = \(timestamp: string\): string => \{[\s\S]*?\n\};\n\nexport const useRecentActivities/,
    'const formatRelativeTime = (timestamp: string): string =>\n  formatAppRelativeTime(timestamp);\n\nexport const useRecentActivities',
    "tempo relativo de atividades",
  );
  return next;
});

edit("src/pages/CertificateValidation.tsx", (source) => {
  let next = addImport(
    source,
    'import { getErrorMessage } from "@/lib/error-message";',
    'import { formatAppDate } from "@/lib/date-time";',
    "import temporal em CertificateValidation",
  );
  next = replaceRequired(
    next,
    /const formatDate = \(value: string \| null\): string =>[\s\S]*?\n\nconst CertificateValidation/,
    'const formatDate = (value: string | null): string =>\n  formatAppDate(value, { dateStyle: "long", fallback: "Não informado" });\n\nconst CertificateValidation',
    "data do certificado público",
  );
  return next;
});

edit("src/pages/Contact.tsx", (source) => {
  let next = addImport(
    source,
    'import { getErrorMessage } from "@/lib/error-message";',
    'import { formatAppDateTime } from "@/lib/date-time";',
    "import temporal em Contact",
  );
  next = replaceRequired(
    next,
    /const formatDateTime = \(value: string\): string =>[\s\S]*?;\n\nconst Contact/,
    'const formatDateTime = (value: string): string =>\n  formatAppDateTime(value);\n\nconst Contact',
    "data e hora do protocolo",
  );
  return next;
});

edit("src/pages/Dashboard.tsx", (source) => {
  let next = addImport(
    source,
    'import { getErrorMessage } from "@/lib/error-message";',
    'import { formatAppDate } from "@/lib/date-time";',
    "import temporal em Dashboard",
  );
  next = replaceRequired(
    next,
    'new Date(user.created_at).toLocaleDateString("pt-BR")',
    'formatAppDate(user.created_at, { dateStyle: "short" })',
    "data de entrada do perfil",
  );
  return next;
});

edit("src/pages/admin/AffiliatesAdmin.tsx", (source) => {
  let next = addImport(
    source,
    'import { getErrorMessage } from "@/lib/error-message";',
    'import { formatAppDate } from "@/lib/date-time";',
    "import temporal em AffiliatesAdmin",
  );
  next = replaceRequired(
    next,
    /const formatDate = \(value: string \| null\): string =>[\s\S]*?;\n\nconst profileStatusLabel/,
    'const formatDate = (value: string | null): string =>\n  formatAppDate(value);\n\nconst profileStatusLabel',
    "datas administrativas de afiliados",
  );
  return next;
});

edit("src/pages/admin/ContactsAdmin.tsx", (source) => {
  let next = addImport(
    source,
    'import { getErrorMessage } from "@/lib/error-message";',
    'import { formatAppDateTime } from "@/lib/date-time";',
    "import temporal em ContactsAdmin",
  );
  next = replaceRequired(
    next,
    /const formatDateTime = \(value: string \| null\): string =>[\s\S]*?;\n\nconst ContactsAdmin/,
    'const formatDateTime = (value: string | null): string =>\n  formatAppDateTime(value, { fallback: "Não registrado" });\n\nconst ContactsAdmin',
    "datas administrativas de contato",
  );
  return next;
});

edit("src/pages/admin/StudentsAdmin.tsx", (source) => {
  let next = addImport(
    source,
    'import { getErrorMessage } from "@/lib/error-message";',
    'import { formatAppDateTime, toUtcIsoString } from "@/lib/date-time";',
    "import temporal em StudentsAdmin",
  );
  next = replaceRequired(
    next,
    /const formatDateTime = \(value: string \| null\): string =>[\s\S]*?;\n\nconst toIso/,
    'const formatDateTime = (value: string | null): string =>\n  formatAppDateTime(value, { fallback: "Sem expiração" });\n\nconst toIso',
    "datas administrativas de alunos",
  );
  next = replaceRequired(
    next,
    /const toIso = \(value: string\): string \| null => \{[\s\S]*?\n\};/,
    'const toIso = (value: string): string | null => toUtcIsoString(value);',
    "normalização UTC de formulários",
  );
  next = replaceRequired(
    next,
    "startsAt ? toIso(startsAt) : new Date().toISOString()",
    "startsAt ? toIso(startsAt) : toUtcIsoString(Date.now())",
    "início UTC da matrícula",
  );
  return next;
});

edit("src/pages/affiliate/AffiliatePortal.tsx", (source) => {
  let next = addImport(
    source,
    'import { getErrorMessage } from "@/lib/error-message";',
    'import { formatAppDate } from "@/lib/date-time";',
    "import temporal em AffiliatePortal",
  );
  next = replaceRequired(
    next,
    /const formatDate = \(value: string \| null\): string =>[\s\S]*?;\n\nconst commissionStatusLabel/,
    'const formatDate = (value: string | null): string =>\n  formatAppDate(value);\n\nconst commissionStatusLabel',
    "datas do portal de afiliados",
  );
  return next;
});

edit("src/pages/student/Certificates.tsx", (source) => {
  let next = addImport(
    source,
    'import { getErrorMessage } from "@/lib/error-message";',
    'import { formatAppDate } from "@/lib/date-time";',
    "import temporal em Certificates",
  );
  next = replaceRequired(
    next,
    /const formatDate = \(value: string\): string =>[\s\S]*?;\n\nconst Certificates/,
    'const formatDate = (value: string): string =>\n  formatAppDate(value, { dateStyle: "long" });\n\nconst Certificates',
    "data do certificado do aluno",
  );
  return next;
});

edit("src/pages/student/MyDigitalProducts.tsx", (source) => {
  let next = addImport(
    source,
    'import { getErrorMessage } from "@/lib/error-message";',
    'import { formatAppDate } from "@/lib/date-time";',
    "import temporal em MyDigitalProducts",
  );
  next = replaceRequired(
    next,
    /const formatDate = \(value: string \| null\): string =>[\s\S]*?;\n\nconst accessSourceLabel/,
    'const formatDate = (value: string | null): string =>\n  formatAppDate(value, { dateStyle: "long", fallback: "Sem prazo definido" });\n\nconst accessSourceLabel',
    "validade do produto digital",
  );
  return next;
});

edit("src/pages/student/StudentPortal.tsx", (source) => {
  let next = addImport(
    source,
    'import { getErrorMessage } from "@/lib/error-message";',
    'import { formatAppDateTime } from "@/lib/date-time";',
    "import temporal em StudentPortal",
  );
  next = replaceRequired(
    next,
    /const formatDateTime = \(value: string \| null\): string =>[\s\S]*?;\n\nconst formatBytes/,
    'const formatDateTime = (value: string | null): string =>\n  formatAppDateTime(value, { fallback: "Não definido" });\n\nconst formatBytes',
    "datas do portal do aluno",
  );
  return next;
});

edit("scripts/check-datetime-analytics-contract.mjs", (source) => {
  let next = replaceRequired(
    source,
    '    "formatAppDateTime",\n    "formatAppRelativeTime",',
    '    "formatAppDateTime",\n    "formatAppTime",\n    "formatAppRelativeTime",',
    "marcador formatAppTime no contrato",
  );
  next = replaceRequired(
    next,
    /  for \(const pattern of fabricatedAnalyticsPatterns\) \{[\s\S]*?\n  \}\n\}/,
    '  if (/(?:Dashboard|Portal|Analytics|Stats|Summary|Metrics)/i.test(displayPath)) {\n    for (const pattern of fabricatedAnalyticsPatterns) {\n      expect(\n        !pattern.test(source),\n        `${displayPath} não pode fabricar métricas ou analytics.`,\n      );\n    }\n  }\n}',
    "escopo de analytics do contrato",
  );
  return next;
});

const packagePath = "package.json";
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
delete packageJson.scripts.postinstall;
writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);
changedFiles.push(packagePath);

unlinkSync(migrationScriptPath);
changedFiles.push(migrationScriptPath);

execFileSync("git", ["config", "user.name", "github-actions[bot]"]);
execFileSync("git", [
  "config",
  "user.email",
  "41898282+github-actions[bot]@users.noreply.github.com",
]);
execFileSync("git", ["add", "--all", ...changedFiles], { stdio: "inherit" });
execFileSync(
  "git",
  [
    "commit",
    "-m",
    "refactor(b26): centralize temporal formatting [skip ci]",
  ],
  { stdio: "inherit" },
);
execFileSync("git", ["push", "origin", "HEAD:dev"], { stdio: "inherit" });

console.log(`Migração B26 aplicada em ${changedFiles.length - 2} arquivos.`);

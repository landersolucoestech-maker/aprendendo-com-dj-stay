import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const read = (relativePath) => readFile(path.join(root, relativePath), "utf8");

const requiredFiles = [
  "docs/refactor/09-design-system.md",
  "src/config/brand.ts",
  "src/index.css",
  "tailwind.config.ts",
  "src/components/ui/button-variants.ts",
  "src/components/ui/card-variants.ts",
  "src/components/ui/card.tsx",
  "src/components/ui/badge-variants.ts",
  "src/components/ui/badge.tsx",
  "src/components/ui/input.tsx",
  "src/components/ui/textarea.tsx",
  "src/components/ui/page-state.tsx",
  "src/components/layout/AppPageShell.tsx",
  "src/components/admin/AdminCourseLayout.tsx",
  "src/components/Navigation.tsx",
  "src/pages/AffiliateRedirect.tsx",
  "src/pages/marketplace/DigitalMarketplace.tsx",
  "src/pages/affiliate/AffiliatePortal.tsx",
  "src/pages/student/Certificates.tsx",
  "src/pages/student/MyDigitalProducts.tsx",
];

const contents = new Map(
  await Promise.all(requiredFiles.map(async (file) => [file, await read(file)])),
);

const fail = (message) => {
  console.error(`FASE B23 bloqueada: ${message}`);
  process.exitCode = 1;
};

const requireText = (file, fragments) => {
  const content = contents.get(file) ?? "";
  for (const fragment of fragments) {
    if (!content.includes(fragment)) fail(`${file} não contém ${fragment}`);
  }
};

const requirePattern = (file, pattern, description) => {
  const content = contents.get(file) ?? "";
  if (!pattern.test(content)) fail(`${file} não satisfaz ${description}`);
};

const forbidText = (file, fragments) => {
  const content = contents.get(file) ?? "";
  for (const fragment of fragments) {
    if (content.includes(fragment)) fail(`${file} ainda contém legado: ${fragment}`);
  }
};

requireText("docs/refactor/09-design-system.md", [
  "# FASE B23 — Identidade visual e design system",
  "Nome oficial aprovado | Bloqueado",
  "Proprietário | LANDER SOLUTIONS",
  "REQ-DS-009",
  "REQ-DS-010",
  "TEST-DS-001",
]);

requireText("src/config/brand.ts", [
  'status: "blocked"',
  'operationalName: "Aprendendo com DJ Stay"',
  "officialName: null",
  "slogan: null",
  "domain: null",
  "emailSender: null",
  'legalOwner: "LANDER SOLUTIONS"',
  'status: "provisional"',
  '"Dica de Cria — com DJ Stay"',
  "name: brandDecision.officialName ?? brandDecision.operationalName",
]);

requireText("src/index.css", [
  "--success:",
  "--warning:",
  "--info:",
  "--course-accent:",
  "--marketplace-accent:",
  "--affiliate-accent:",
  "--admin-accent:",
  "--context-accent:",
  '[data-context="course"]',
  '[data-context="marketplace"]',
  '[data-context="affiliate"]',
  '[data-context="admin"]',
  ".app-shell",
  ".app-header",
  ".app-container",
  ".state-panel",
  ".interactive-surface",
  "@media (prefers-reduced-motion: reduce)",
]);

requireText("tailwind.config.ts", [
  'DEFAULT: "hsl(var(--success))"',
  'DEFAULT: "hsl(var(--warning))"',
  'DEFAULT: "hsl(var(--info))"',
  'DEFAULT: "hsl(var(--context-accent))"',
  'DEFAULT: "hsl(var(--course-accent))"',
  'DEFAULT: "hsl(var(--marketplace-accent))"',
  'DEFAULT: "hsl(var(--affiliate-accent))"',
  'DEFAULT: "hsl(var(--admin-accent))"',
  'soft: "var(--shadow-soft)"',
  'raised: "var(--shadow-raised)"',
  'sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]',
]);
forbidText("tailwind.config.ts", ["#38b6ff", "#0cc0df", "#004aad"]);

requireText("src/components/ui/button-variants.ts", [
  "brand:",
  "context:",
  "success:",
  "warning:",
  "soft:",
  'xs: "h-8',
  'xl: "h-12',
  "focus-visible:ring-ring",
  "disabled:pointer-events-none",
]);

requireText("src/components/ui/card-variants.ts", [
  "export const cardVariants = cva",
  "interactive:",
  "course:",
  "marketplace:",
  "affiliate:",
  "admin:",
]);
requireText("src/components/ui/card.tsx", [
  'import { cardVariants } from "@/components/ui/card-variants"',
  "VariantProps<typeof cardVariants>",
  "cardVariants({ variant })",
]);
forbidText("src/components/ui/card.tsx", ["const cardVariants = cva"]);

requireText("src/components/ui/badge-variants.ts", [
  "export const badgeVariants = cva",
  "success:",
  "warning:",
  "info:",
  "course:",
  "marketplace:",
  "affiliate:",
  "admin:",
]);
requireText("src/components/ui/badge.tsx", [
  'import { badgeVariants } from "@/components/ui/badge-variants"',
  "VariantProps<typeof badgeVariants>",
]);
forbidText("src/components/ui/badge.tsx", ["const badgeVariants = cva"]);

for (const file of ["src/components/ui/input.tsx", "src/components/ui/textarea.tsx"]) {
  requireText(file, [
    "bg-surface-subtle/50",
    "hover:border-context/40",
    "aria-[invalid=true]:border-destructive",
    "disabled:bg-muted/40",
  ]);
}

requireText("src/components/ui/page-state.tsx", [
  'export type PageStateVariant = "loading" | "error" | "empty" | "success"',
  'role: "alert"',
  'role: "status"',
  "aria-live=",
  "aria-busy=",
  'className={cn("state-panel"',
]);

requireText("src/components/layout/AppPageShell.tsx", [
  "export type ProductContext =",
  '"course"',
  '"marketplace"',
  '"affiliate"',
  '"admin"',
  'className="app-shell"',
  "data-context={context}",
  'className={cn("app-header"',
  'className={cn("app-container py-8"',
]);

requireText("src/components/admin/AdminCourseLayout.tsx", [
  'import { AppPageShell } from "@/components/layout/AppPageShell"',
  'context="admin"',
  'eyebrow="Administração"',
]);
forbidText("src/components/admin/AdminCourseLayout.tsx", [
  "bg-black",
  "text-white",
  "text-purple-",
  "text-gray-",
  "border-white/",
]);

requireText("src/components/Navigation.tsx", [
  'import { brandConfig } from "@/config/brand"',
  "src={brandConfig.logoPath}",
  "alt={brandConfig.logoAlt}",
  "{brandConfig.name}",
  'variant="brand"',
  'aria-label="Navegação principal"',
  'aria-controls="mobile-navigation"',
  "aria-expanded={isOpen}",
  'border-border bg-background/90',
]);
forbidText("src/components/Navigation.tsx", [
  "btn-neon",
  "btn-brand",
  "lovable-uploads",
  "bg-black",
  "text-gray-",
  "border-white/",
]);

requireText("src/pages/AffiliateRedirect.tsx", [
  'variant="brand"',
  "bg-background",
  "border-border",
  "bg-card",
  "text-muted-foreground",
  "text-brand-light",
]);

requireText("src/pages/marketplace/DigitalMarketplace.tsx", [
  'context="marketplace"',
  'variant="marketplace"',
  'variant="context"',
  "<PageState",
  'aria-label="Produtos digitais publicados"',
  "<Button asChild",
]);
forbidText("src/pages/marketplace/DigitalMarketplace.tsx", [
  "btn-brand",
  "bg-black",
  "text-white",
  "text-violet-",
  "text-gray-",
  "border-white/",
]);

requireText("src/pages/affiliate/AffiliatePortal.tsx", [
  'context="affiliate"',
  'variant="affiliate"',
  'variant="context"',
  "<PageState",
  'scope="col"',
  "aria-label={`Copiar link ${item.code}`}",
  "<Button asChild",
]);
forbidText("src/pages/affiliate/AffiliatePortal.tsx", [
  "fieldClass",
  "btn-brand",
  "bg-black",
  "text-white",
  "text-violet-",
  "text-gray-",
  "border-white/",
]);

requireText("src/pages/student/Certificates.tsx", [
  'context="course"',
  'variant="course"',
  "<PageState",
  "<Button asChild",
  'aria-label="Certificados do aluno"',
]);
requirePattern(
  "src/pages/student/Certificates.tsx",
  /variant\s*=\s*\{\s*certificate\.status\s*===\s*"issued"\s*\?\s*"success"\s*:\s*"destructive"\s*\}/s,
  "mapeamento semântico de certificado emitido para success e revogado para destructive",
);
forbidText("src/pages/student/Certificates.tsx", [
  "btn-brand",
  "bg-black",
  "text-white",
  "text-gray-",
  "bg-red-",
  "border-white/",
]);

requireText("src/pages/student/MyDigitalProducts.tsx", [
  'context="marketplace"',
  'variant="marketplace"',
  'variant="success"',
  "<PageState",
  "<Button asChild",
  'aria-label="Produtos digitais adquiridos"',
  "downloadPrivateAsset",
]);
forbidText("src/pages/student/MyDigitalProducts.tsx", [
  "btn-brand",
  "bg-black",
  "text-white",
  "text-gray-",
  "bg-green-",
  "border-white/",
]);

if (process.exitCode) process.exit(process.exitCode);
console.log("Contrato estático do lote aluno da FASE B23 aprovado.");

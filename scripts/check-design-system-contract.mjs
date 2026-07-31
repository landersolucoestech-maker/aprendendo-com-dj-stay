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
  "src/components/ui/card.tsx",
  "src/components/ui/badge.tsx",
  "src/components/ui/input.tsx",
  "src/components/ui/textarea.tsx",
  "src/components/ui/page-state.tsx",
  "src/components/layout/AppPageShell.tsx",
  "src/components/admin/AdminCourseLayout.tsx",
  "src/components/Navigation.tsx",
  "src/pages/AffiliateRedirect.tsx",
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
  "REQ-DS-001",
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

requireText("src/components/ui/card.tsx", [
  "const cardVariants = cva",
  "interactive:",
  "course:",
  "marketplace:",
  "affiliate:",
  "admin:",
  "export interface CardProps",
]);

requireText("src/components/ui/badge.tsx", [
  "success:",
  "warning:",
  "info:",
  "course:",
  "marketplace:",
  "affiliate:",
  "admin:",
]);

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
  'variant="outline"',
  'variant="ghost"',
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
forbidText("src/pages/AffiliateRedirect.tsx", [
  "btn-brand",
  "bg-black",
  "text-violet-",
  "text-gray-",
  "border-white/",
]);

if (process.exitCode) process.exit(process.exitCode);
console.log("Contrato estático do núcleo da FASE B23 aprovado.");

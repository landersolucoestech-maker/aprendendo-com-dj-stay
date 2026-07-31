import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const read = (relativePath) => readFile(path.join(root, relativePath), "utf8");

const requiredFiles = [
  "src/config/brand.ts",
  "src/index.css",
  "tailwind.config.ts",
  "src/components/ui/button-variants.ts",
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

requireText("src/config/brand.ts", [
  'name: "Aprendendo com DJ Stay"',
  "logoPath:",
  "logoAlt:",
  "as const",
]);

requireText("src/index.css", [
  "--brand-light:",
  "--brand-medium:",
  "--brand-dark:",
  "--surface-raised:",
  "--surface-overlay:",
  ".gradient-text",
  ".btn-brand",
]);

requireText("tailwind.config.ts", [
  'light: "hsl(var(--brand-light))"',
  'medium: "hsl(var(--brand-medium))"',
  'dark: "hsl(var(--brand-dark))"',
  'sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]',
]);
forbidText("tailwind.config.ts", ["#38b6ff", "#0cc0df", "#004aad"]);

requireText("src/components/ui/button-variants.ts", [
  "brand:",
  "bg-gradient-brand-light",
  "focus-visible:ring-ring",
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
console.log("Contrato estático da FASE B23 aprovado.");

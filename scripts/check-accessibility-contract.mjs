import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const read = (relativePath) => readFile(path.join(root, relativePath), "utf8");

const requiredFiles = [
  "src/accessibility/RouteAccessibility.tsx",
  "src/App.tsx",
  "src/index.css",
  "src/components/Navigation.tsx",
  "src/components/ui/button-variants.ts",
  "src/pages/Index.tsx",
  "src/pages/Login.tsx",
  "src/pages/Register.tsx",
  "src/pages/ForgotPassword.tsx",
  "src/pages/ResetPassword.tsx",
  "src/pages/VerifyEmail.tsx",
  "src/pages/Verified.tsx",
  "src/pages/Contact.tsx",
  "src/pages/CertificateValidation.tsx",
  "src/pages/AffiliateRedirect.tsx",
  "src/pages/AccessDenied.tsx",
  "src/pages/NotFound.tsx",
  "src/routing/AuthLoadingScreen.tsx",
];

const contents = new Map(
  await Promise.all(requiredFiles.map(async (file) => [file, await read(file)])),
);

const fail = (message) => {
  console.error(`FASE B24 bloqueada: ${message}`);
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

requireText("src/accessibility/RouteAccessibility.tsx", [
  'const focusTargetId = "main-content"',
  "Pular para o conteúdo principal",
  "useLocation()",
  "useCallback",
  'boundary.setAttribute("role", "main")',
  "target.focus({ preventScroll: true })",
  'aria-live="polite"',
]);

requireText("src/App.tsx", [
  'import { RouteAccessibility } from "@/accessibility/RouteAccessibility"',
  "<RouteAccessibility>",
  "</RouteAccessibility>",
]);

requireText("src/index.css", [
  "a:focus-visible",
  "button:focus-visible",
  "outline: 2px solid hsl(var(--ring))",
  "@media (prefers-reduced-motion: reduce)",
  "animation-duration: 0.01ms !important",
  "transition-duration: 0.01ms !important",
  "text-primary-foreground",
]);

requireText("src/components/ui/button-variants.ts", [
  "bg-gradient-brand-light text-primary-foreground",
  "focus-visible:ring-ring",
]);
forbidText("src/components/ui/button-variants.ts", [
  'brand:\n          "bg-gradient-brand-light text-white',
]);

requireText("src/pages/Index.tsx", [
  '<main id="main-content" tabIndex={-1}>',
  "bg-background text-foreground",
]);
forbidText("src/pages/Index.tsx", ["bg-black", "text-white"]);

requireText("src/components/Navigation.tsx", [
  "menuButtonRef",
  "mobileMenuRef",
  'event.key !== "Escape"',
  "menuButtonRef.current?.focus()",
  '"(prefers-reduced-motion: reduce)"',
  'behavior: prefersReducedMotion ? "auto" : "smooth"',
  'aria-controls="mobile-navigation"',
  "aria-expanded={isOpen}",
]);

const formContracts = {
  "src/pages/Login.tsx": [
    "<main",
    'role="alert"',
    "aria-busy={isLoading}",
    'autoComplete="email"',
    'autoComplete="current-password"',
    "aria-pressed={showPassword}",
    'variant="brand"',
  ],
  "src/pages/Register.tsx": [
    "<main",
    'role="alert"',
    "aria-busy={isLoading}",
    'autoComplete="name"',
    'autoComplete="new-password"',
    "aria-pressed={showPassword}",
    'variant="brand"',
  ],
  "src/pages/ForgotPassword.tsx": [
    "<main",
    'role="alert"',
    'role="status"',
    "aria-busy={isLoading}",
    'autoComplete="email"',
    'variant="brand"',
  ],
  "src/pages/ResetPassword.tsx": [
    "<main",
    'role="alert"',
    "aria-busy={isLoading}",
    'autoComplete="new-password"',
    "aria-pressed={showPassword}",
    'variant="brand"',
  ],
  "src/pages/Contact.tsx": [
    "<main>",
    'role="status"',
    'role="alert"',
    "aria-busy={submitContact.isPending}",
    'autoComplete="name"',
    'autoComplete="email"',
    'variant="brand"',
  ],
  "src/pages/CertificateValidation.tsx": [
    "<main",
    'role="search"',
    'role="status"',
    'role="alert"',
    'aria-busy={validationQuery.isLoading}',
    'aria-invalid={input.length > 0 && !validInputFormat}',
    'variant="brand"',
  ],
};

for (const [file, fragments] of Object.entries(formContracts)) {
  requireText(file, fragments);
}

requireText("src/pages/VerifyEmail.tsx", [
  "<main",
  "aria-busy={isResending}",
  'role={feedback.type === "error" ? "alert" : "status"}',
  '<Button asChild variant="outline"',
  '<Button asChild variant="secondary"',
]);
requireText("src/pages/Verified.tsx", [
  "<main",
  'role="status"',
  '<Button asChild variant="brand"',
]);
requireText("src/pages/AccessDenied.tsx", [
  "<main",
  'role="alert"',
  '<Button asChild variant="brand"',
]);
requireText("src/pages/NotFound.tsx", [
  "<main",
  'aria-labelledby="not-found-title"',
  '<Button asChild variant="brand"',
]);
requireText("src/routing/AuthLoadingScreen.tsx", [
  "<main",
  'aria-busy="true"',
  'role="status"',
  'aria-live="polite"',
]);
requireText("src/pages/AffiliateRedirect.tsx", [
  'aria-hidden="true"',
  'variant="brand"',
  "text-muted-foreground",
]);

const migratedFiles = [
  "src/pages/Login.tsx",
  "src/pages/Register.tsx",
  "src/pages/ForgotPassword.tsx",
  "src/pages/ResetPassword.tsx",
  "src/pages/VerifyEmail.tsx",
  "src/pages/Verified.tsx",
  "src/pages/Contact.tsx",
  "src/pages/CertificateValidation.tsx",
  "src/pages/AccessDenied.tsx",
  "src/pages/NotFound.tsx",
  "src/routing/AuthLoadingScreen.tsx",
];

for (const file of migratedFiles) {
  forbidText(file, [
    "btn-neon",
    "btn-brand",
    "text-neon-",
    "bg-black text-white",
    "text-gray-",
  ]);

  const content = contents.get(file) ?? "";
  const linkContainsButton = /<Link\b[^>]*>(?:(?!<\/Link>)[\s\S])*?<Button\b/;
  if (linkContainsButton.test(content)) {
    fail(`${file} contém Button aninhado dentro de Link`);
  }
}

if (process.exitCode) process.exit(process.exitCode);
console.log("Contrato estático da FASE B24 aprovado.");

import { existsSync, readFileSync } from "node:fs";

const checkoutSourcePath = "src/contracts/checkout.ts";
const checkoutTestPath = "src/contracts/checkout.test.ts";
const idempotencySourcePath = "src/lib/hosted-checkout-idempotency.ts";
const idempotencyTestPath = "src/lib/hosted-checkout-idempotency.test.ts";
const checkoutHookPath = "src/hooks/useHostedCheckout.ts";
const documentationPath =
  "docs/refactor/FASE-B61-CHECKOUT-CONTRACT-IDEMPOTENCY-TESTS.md";
const packagePath = "package.json";
const failures = [];

const requiredPaths = [
  checkoutSourcePath,
  checkoutTestPath,
  idempotencySourcePath,
  idempotencyTestPath,
  checkoutHookPath,
  documentationPath,
  packagePath,
];

for (const path of requiredPaths) {
  if (!existsSync(path)) failures.push(`Arquivo obrigatório ausente: ${path}`);
}

const requireFragments = (path, fragments, category) => {
  const content = readFileSync(path, "utf8");
  for (const fragment of fragments) {
    if (!content.includes(fragment)) {
      failures.push(`${path}: ${category} ausente: ${fragment}`);
    }
  }
};

if (failures.length === 0) {
  requireFragments(
    checkoutSourcePath,
    [
      'z.enum(["course", "digital_product"])',
      "subjectId: z.string().uuid()",
      "licenseId: z.string().uuid().nullable()",
      "idempotencyKey: z.string().uuid()",
      ".strict()",
      'value.subjectType === "course"',
      'value.subjectType === "digital_product"',
      'value.startsWith("https://")',
      "datetime({ offset: true })",
      'z.literal("checkout_created")',
    ],
    "contrato de produção",
  );

  requireFragments(
    checkoutTestPath,
    [
      'from "vitest"',
      "checkoutSubjectTypeSchema",
      "hostedCheckoutInputSchema",
      "hostedCheckoutResultSchema",
      '"course"',
      '"digital_product"',
      '"not-a-uuid"',
      '"http://checkout.example.com/session/abc"',
      '"2026-08-02T06:30:00"',
      'status: "paid"',
      "providerPayload",
      "safeParse",
    ],
    "cobertura obrigatória",
  );

  requireFragments(
    idempotencySourcePath,
    [
      "IDEMPOTENCY_KEY_PATTERN",
      "window.sessionStorage.getItem",
      "window.sessionStorage.setItem",
      "window.sessionStorage.removeItem",
      "crypto.randomUUID()",
      "try {",
      "catch {",
      'licenseId ?? "none"',
    ],
    "resiliência obrigatória",
  );

  requireFragments(
    idempotencyTestPath,
    [
      'from "vitest"',
      "getHostedCheckoutIdempotencyKey",
      "clearHostedCheckoutIdempotencyKey",
      'storedKey: "invalid-key"',
      'readError: new Error("sessionStorage bloqueado")',
      'writeError: new Error("quota indisponível")',
      'removeError: new Error("storage indisponível")',
      "not.toThrow()",
      "vi.unstubAllGlobals()",
    ],
    "cobertura de idempotência",
  );

  requireFragments(
    checkoutHookPath,
    [
      'from "@/lib/hosted-checkout-idempotency"',
      "hostedCheckoutInputSchema",
      "hostedCheckoutResultSchema",
      'supabase.functions.invoke("create-asaas-checkout"',
    ],
    "integração do checkout",
  );

  const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
  if (
    packageJson.scripts?.["check:checkout-tests"] !==
    "node scripts/check-checkout-tests.mjs"
  ) {
    failures.push(`${packagePath}: script check:checkout-tests ausente ou divergente`);
  }
  if (!packageJson.scripts?.typecheck?.includes("npm run check:checkout-tests")) {
    failures.push(`${packagePath}: B61 não está encadeada ao typecheck`);
  }
}

if (failures.length > 0) {
  console.error("Falhas no contrato B61:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  "Contrato B61 aprovado: checkout estrito e idempotência resiliente possuem cobertura unitária e integração permanente ao gate.",
);

import { existsSync, readFileSync } from "node:fs";

const paths = {
  checkout: "src/contracts/checkout.ts",
  admin: "src/contracts/payment-admin.ts",
  student: "src/contracts/student-payments.ts",
  tests: "src/contracts/payment-read-models.test.ts",
  documentation:
    "docs/refactor/FASE-B62-PAYMENT-READ-MODEL-CONTRACT-TESTS.md",
  package: "package.json",
};

const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

for (const path of Object.values(paths)) {
  expect(existsSync(path), `${path} deve existir.`);
}

const read = (path) => (existsSync(path) ? readFileSync(path, "utf8") : "");
const checkout = read(paths.checkout);
const admin = read(paths.admin);
const student = read(paths.student);
const tests = read(paths.tests);
const documentation = read(paths.documentation);
const packageJson = existsSync(paths.package)
  ? JSON.parse(read(paths.package))
  : { scripts: {} };

expect(
  checkout.includes('z.enum(["course", "digital_product"])'),
  "Contrato canônico do tipo de checkout deve permanecer definido.",
);
expect(
  admin.includes('from "@/contracts/checkout"') &&
    admin.includes("export { checkoutSubjectTypeSchema }"),
  "Contrato administrativo deve reutilizar e reexportar o tipo canônico de checkout.",
);
expect(
  !admin.includes(
    'export const checkoutSubjectTypeSchema = z.enum(["course", "digital_product"])',
  ),
  "Contrato administrativo não pode duplicar o enum de tipo de checkout.",
);
expect(
  admin.includes("currencyCodeSchema") &&
    admin.includes("/^[A-Z]{3}$/"),
  "Contrato financeiro deve exigir código monetário alfabético maiúsculo.",
);
expect(
  admin.includes("validatePaymentSubjectLicense") &&
    admin.includes('.subject_type === "course"') &&
    admin.includes('.subject_type === "digital_product"'),
  "Contrato financeiro deve validar a coerência entre item e licença.",
);
expect(
  admin.includes(".strict()") && student.includes(".strict()"),
  "Modelos financeiros administrativo e do aluno devem rejeitar campos extras.",
);
expect(
  student.includes("currencyCodeSchema") &&
    student.includes("validatePaymentSubjectLicense"),
  "Histórico do aluno deve reutilizar moeda e coerência financeira compartilhadas.",
);

for (const fragment of [
  "canonicalSubjectTypeSchema",
  "PAYMENT_STATUSES",
  '"BRL"',
  '"brl"',
  '"B1L"',
  "ADMIN_COURSE_ORDER",
  "ADMIN_DIGITAL_PRODUCT_ORDER",
  "STUDENT_COURSE_ORDER",
  "provider_payload",
  "raw_payload",
  "internal_note",
  "gross_margin",
  "internal_total",
  'created_at: "2026-08-02T06:30:00"',
  "amount_cents: -1",
  "total_orders: -1",
]) {
  expect(tests.includes(fragment), `Cobertura B62 ausente: ${fragment}`);
}

expect(
  tests.includes("paymentAdminDashboardSchema") &&
    tests.includes("studentPaymentHistorySchema") &&
    tests.includes("safeParse"),
  "Suíte B62 deve cobrir os modelos raiz e cenários negativos.",
);
expect(
  documentation.includes("Fase B62") &&
    documentation.includes("Nenhuma migration"),
  "Documentação B62 deve registrar escopo e exclusões.",
);
expect(
  packageJson.scripts?.["check:payment-read-model-tests"] ===
    "node scripts/check-payment-read-model-tests.mjs",
  "package.json deve expor check:payment-read-model-tests.",
);
expect(
  packageJson.scripts?.typecheck?.includes(
    "npm run check:payment-read-model-tests",
  ),
  "Contrato B62 deve estar encadeado ao typecheck.",
);

if (failures.length > 0) {
  console.error("Falhas no contrato B62:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(
  "Contrato B62 aprovado: modelos financeiros de leitura compartilham primitivas canônicas, rejeitam payloads divergentes e possuem cobertura unitária.",
);

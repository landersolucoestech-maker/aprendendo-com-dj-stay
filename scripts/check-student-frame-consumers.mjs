import { existsSync, readFileSync } from "node:fs";

const pages = {
  favorites: "src/pages/student/StudentFavorites.tsx",
  notifications: "src/pages/student/StudentNotifications.tsx",
  support: "src/pages/student/StudentSupport.tsx",
  financial: "src/pages/student/StudentFinancialPortal.tsx",
  preferences: "src/pages/student/StudentCommunicationPreferences.tsx",
  privacy: "src/pages/student/StudentPrivacyRights.tsx",
};

const paths = {
  frame: "src/components/student/StudentPortalPageFrame.tsx",
  b38: "scripts/check-student-payment-history.mjs",
  b39: "scripts/check-support-ticketing.mjs",
  b40: "scripts/check-student-notifications.mjs",
  b41: "scripts/check-student-favorites.mjs",
  b42: "scripts/check-student-communication-preferences.mjs",
  b44: "scripts/check-privacy-rights-requests.mjs",
  b84: "scripts/check-student-page-frame.mjs",
  documentation: "docs/refactor/FASE-B86-STUDENT-FRAME-CONSUMERS.md",
  package: "package.json",
};

const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};
const read = (path) => (existsSync(path) ? readFileSync(path, "utf8") : "");

for (const path of [...Object.values(pages), ...Object.values(paths)]) {
  expect(existsSync(path), `${path} deve existir.`);
}

const sources = Object.fromEntries(
  Object.entries(pages).map(([name, path]) => [name, read(path)]),
);
const frame = read(paths.frame);
const contracts = {
  B38: read(paths.b38),
  B39: read(paths.b39),
  B40: read(paths.b40),
  B41: read(paths.b41),
  B42: read(paths.b42),
  B44: read(paths.b44),
};
const b84 = read(paths.b84);
const documentation = read(paths.documentation);
const packageJson = existsSync(paths.package)
  ? JSON.parse(read(paths.package))
  : { scripts: {} };

for (const [name, source] of Object.entries(sources)) {
  expect(
    source.includes('import { StudentPortalPageFrame } from "@/components/student/StudentPortalPageFrame";'),
    `${name} deve importar StudentPortalPageFrame.`,
  );
  expect(
    (source.match(/<StudentPortalPageFrame>/g) ?? []).length === 1 &&
      (source.match(/<\/StudentPortalPageFrame>/g) ?? []).length === 1,
    `${name} deve usar exatamente um frame compartilhado.`,
  );

  for (const forbidden of [
    "StudentPortalShell",
    "getUserMetadataProfile",
    "useAuth()",
    "isSigningOut",
    "handleSignOut",
    "await signOut()",
    'navigate("/login", { replace: true })',
  ]) {
    expect(
      !source.includes(forbidden),
      `${name} não pode restaurar wrapper local: ${forbidden}`,
    );
  }
}

for (const fragment of [
  "getUserMetadataProfile",
  "useAuth()",
  "useNavigate()",
  "useState(false)",
  "await signOut()",
  'navigate("/login", { replace: true })',
  "<StudentPortalShell",
]) {
  expect(frame.includes(fragment), `Fonte única do frame ausente: ${fragment}`);
}

for (const fragment of [
  "useStudentFavorites",
  "FavoriteToggleButton",
  "favorite.action_path",
  "Explorar marketplace",
]) {
  expect(sources.favorites.includes(fragment), `Favoritos B86 ausente: ${fragment}`);
}
for (const fragment of [
  "useStudentNotifications",
  "useMarkStudentNotificationRead",
  "useMarkAllStudentNotificationsRead",
  "notification.action_path",
  "Marcar todas como lidas",
]) {
  expect(sources.notifications.includes(fragment), `Notificações B86 ausente: ${fragment}`);
}
for (const fragment of [
  "useMySupportTickets",
  "useCreateSupportTicket",
  "useAddMySupportMessage",
  "crypto.randomUUID()",
  "Abrir ticket",
  "Enviar resposta",
]) {
  expect(sources.support.includes(fragment), `Suporte B86 ausente: ${fragment}`);
}
for (const fragment of [
  "useStudentPaymentHistory",
  'readonly section: "orders" | "payments"',
  "statusLabels",
  "order.latest_attempt",
  "order.entitlement",
]) {
  expect(sources.financial.includes(fragment), `Financeiro B86 ausente: ${fragment}`);
}
for (const fragment of [
  'CONSENT_VERSION = "privacy-2026-08-01"',
  "useStudentCommunicationPreferences",
  "useUpdateStudentCommunicationPreferences",
  "emailMarketing || privacyAnalytics ? CONSENT_VERSION : null",
  "Salvar preferências",
]) {
  expect(sources.preferences.includes(fragment), `Preferências B86 ausente: ${fragment}`);
}
for (const fragment of [
  "useMyPrivacyRightsRequests",
  "useCreatePrivacyRightsRequest",
  "useCancelPrivacyRightsRequest",
  'request_type: requestType',
  "Cancelar solicitação",
  "request.events.map",
]) {
  expect(sources.privacy.includes(fragment), `Privacidade B86 ausente: ${fragment}`);
}

const contractRequirements = {
  B38: ["useStudentPaymentHistory", "StudentFinancialPortal", "/aluno/pedidos", "/aluno/pagamentos"],
  B39: ["useMySupportTickets", "useCreateSupportTicket", "useAddMySupportMessage", "/aluno/suporte"],
  B40: ["useStudentNotifications", "useMarkStudentNotificationRead", "useMarkAllStudentNotificationsRead", "/aluno/notificacoes"],
  B41: ["useStudentFavorites", "FavoriteToggleButton", "/aluno/favoritos"],
  B42: ["useStudentCommunicationPreferences", "useUpdateStudentCommunicationPreferences", "/aluno/preferencias"],
  B44: ["useMyPrivacyRightsRequests", "useCreatePrivacyRightsRequest", "useCancelPrivacyRightsRequest", "/aluno/privacidade"],
};

for (const [name, fragments] of Object.entries(contractRequirements)) {
  const source = contracts[name];
  for (const fragment of fragments) {
    expect(source.includes(fragment), `Contrato ${name} perdeu garantia de domínio: ${fragment}`);
  }
}

for (const fragment of [
  "<StudentPortalPageFrame>",
  "Financeiro não pode restaurar o wrapper local removido pela B86",
  "B84/B85/B86",
]) {
  expect(b84.includes(fragment), `Ponte B84/B86 ausente: ${fragment}`);
}

expect(
  documentation.includes("Fase B86") &&
    documentation.includes("seis páginas") &&
    documentation.includes("B38") &&
    documentation.includes("B44") &&
    documentation.includes("Nenhuma migration") &&
    documentation.includes("Supabase remoto") &&
    documentation.includes("branch `main`"),
  "Documentação B86 deve registrar consumidores, contratos e exclusões.",
);
expect(
  packageJson.scripts?.["check:student-frame-consumers"] ===
    "node scripts/check-student-frame-consumers.mjs",
  "package.json deve expor check:student-frame-consumers.",
);
expect(
  packageJson.scripts?.typecheck?.includes("npm run check:student-frame-consumers"),
  "Contrato B86 deve estar encadeado ao typecheck.",
);

const typecheck = packageJson.scripts?.typecheck ?? "";
const editorIndex = typecheck.indexOf("npm run check:student-profile-editor");
const consumersIndex = typecheck.indexOf("npm run check:student-frame-consumers");
const playerIndex = typecheck.indexOf("npm run check:player-progress");
expect(
  editorIndex >= 0 && consumersIndex > editorIndex && playerIndex > consumersIndex,
  "O gate B86 deve executar após B85 e antes do player.",
);

if (failures.length > 0) {
  console.error("Falhas no contrato B86:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(
  "Contrato B86 aprovado: seis páginas independentes usam o frame único sem alterar os domínios B38, B39, B40, B41, B42 e B44.",
);

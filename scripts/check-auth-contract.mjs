import { readFileSync } from "node:fs";

const files = {
  app: readFileSync("src/App.tsx", "utf8"),
  provider: readFileSync("src/auth/AuthProvider.tsx", "utf8"),
  client: readFileSync("src/integrations/supabase/client.ts", "utf8"),
  studentDashboard: readFileSync("src/pages/student/StudentDashboardPage.tsx", "utf8"),
  navigation: readFileSync("src/components/Navigation.tsx", "utf8"),
  forgotPassword: readFileSync("src/pages/ForgotPassword.tsx", "utf8"),
  verifyEmail: readFileSync("src/pages/VerifyEmail.tsx", "utf8"),
};

const failures = [];
const requireText = (content, expected, message) => {
  if (!content.includes(expected)) failures.push(message);
};
const forbidText = (content, forbidden, message) => {
  if (content.includes(forbidden)) failures.push(message);
};

requireText(files.app, "<AuthProvider>", "AuthProvider não está montado na raiz.");
requireText(files.app, "<RequireAuth>", "Rotas privadas não usam RequireAuth.");
requireText(files.app, "<PublicOnlyRoute>", "Rotas públicas de Auth não usam PublicOnlyRoute.");
requireText(files.provider, "onAuthStateChange", "O provider não observa mudanças de sessão.");
requireText(files.provider, "queryClient.clear()", "O cache não é limpo ao trocar de usuário.");
requireText(files.client, 'flowType: "pkce"', "O cliente não utiliza PKCE.");
requireText(files.forgotPassword, "requestPasswordReset", "Recuperação de senha não usa o serviço real.");
requireText(files.verifyEmail, "resendSignupConfirmation", "Reenvio de confirmação não usa o serviço real.");
forbidText(files.studentDashboard, "Usuário Demo", "Dashboard do aluno ainda possui usuário demonstrativo.");
forbidText(files.navigation, "onAuthStateChange", "Navigation mantém listener de Auth duplicado.");
forbidText(files.verifyEmail, "setTimeout", "Confirmação de email ainda está simulada.");

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Contrato de autenticação validado.");

import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { AuthProvider } from "@/auth/AuthProvider";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { queryClient } from "@/lib/query-client";
import AccessDenied from "@/pages/AccessDenied";
import AuthCallback from "@/pages/AuthCallback";
import Contact from "@/pages/Contact";
import Dashboard from "@/pages/Dashboard";
import EditProfile from "@/pages/EditProfile";
import ForgotPassword from "@/pages/ForgotPassword";
import Index from "@/pages/Index";
import Lesson from "@/pages/Lesson";
import Login from "@/pages/Login";
import NotFound from "@/pages/NotFound";
import PaymentSuccess from "@/pages/PaymentSuccess";
import Register from "@/pages/Register";
import ResetPassword from "@/pages/ResetPassword";
import Verified from "@/pages/Verified";
import VerifyEmail from "@/pages/VerifyEmail";
import { PublicOnlyRoute } from "@/routing/PublicOnlyRoute";
import { RequireAuth } from "@/routing/RequireAuth";
import { RequireRole } from "@/routing/RequireRole";
import { RoleLandingRedirect } from "@/routing/RoleLandingRedirect";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/contato" element={<Contact />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/verificar-email" element={<VerifyEmail />} />
            <Route path="/verificado" element={<Verified />} />
            <Route path="/redefinir-senha" element={<ResetPassword />} />
            <Route path="/acesso-negado" element={<AccessDenied />} />
            <Route path="/pagamento-sucesso" element={<PaymentSuccess />} />

            <Route
              path="/login"
              element={
                <PublicOnlyRoute>
                  <Login />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/matricule-se"
              element={
                <PublicOnlyRoute>
                  <Register />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/esqueceu-senha"
              element={
                <PublicOnlyRoute>
                  <ForgotPassword />
                </PublicOnlyRoute>
              }
            />

            <Route
              path="/portal"
              element={
                <RequireAuth>
                  <RoleLandingRedirect />
                </RequireAuth>
              }
            />
            <Route
              path="/dashboard"
              element={
                <RequireAuth>
                  <RequireRole allowedRoles={["aluno", "administrador_proprietario"]}>
                    <Dashboard />
                  </RequireRole>
                </RequireAuth>
              }
            />
            <Route
              path="/aula/:lessonId"
              element={
                <RequireAuth>
                  <RequireRole allowedRoles={["aluno", "administrador_proprietario"]}>
                    <Lesson />
                  </RequireRole>
                </RequireAuth>
              }
            />
            <Route
              path="/editar-perfil"
              element={
                <RequireAuth>
                  <RequireRole allowedRoles={["aluno", "afiliado", "administrador_proprietario"]}>
                    <EditProfile />
                  </RequireRole>
                </RequireAuth>
              }
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

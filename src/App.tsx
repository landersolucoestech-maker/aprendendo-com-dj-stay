import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AuthProvider } from "@/auth/AuthProvider";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { queryClient } from "@/lib/query-client";
import AccessDenied from "@/pages/AccessDenied";
import AuthCallback from "@/pages/AuthCallback";
import Contact from "@/pages/Contact";
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
import CourseCurriculum from "@/pages/admin/CourseCurriculum";
import CourseEditor from "@/pages/admin/CourseEditor";
import CoursePreview from "@/pages/admin/CoursePreview";
import CoursesAdmin from "@/pages/admin/CoursesAdmin";
import DigitalProductsAdmin from "@/pages/admin/DigitalProductsAdmin";
import DigitalMarketplace from "@/pages/marketplace/DigitalMarketplace";
import MyDigitalProducts from "@/pages/student/MyDigitalProducts";
import StudentPortal from "@/pages/student/StudentPortal";
import { PublicOnlyRoute } from "@/routing/PublicOnlyRoute";
import { RequireAuth } from "@/routing/RequireAuth";
import { RequireRole } from "@/routing/RequireRole";
import { RoleLandingRedirect } from "@/routing/RoleLandingRedirect";

const StudentRoute = ({ children }: { children: React.ReactNode }) => (
  <RequireAuth>
    <RequireRole allowedRoles={["aluno"]}>{children}</RequireRole>
  </RequireAuth>
);

const MarketplaceRoute = ({ children }: { children: React.ReactNode }) => (
  <RequireAuth>
    <RequireRole allowedRoles={["aluno", "afiliado", "administrador_proprietario"]}>
      {children}
    </RequireRole>
  </RequireAuth>
);

const AdminRoute = ({ children }: { children: React.ReactNode }) => (
  <RequireAuth>
    <RequireRole allowedRoles={["administrador_proprietario"]}>{children}</RequireRole>
  </RequireAuth>
);

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
            <Route
              path="/pagamento-sucesso"
              element={
                <RequireAuth>
                  <RequireRole allowedRoles={["aluno", "administrador_proprietario"]}>
                    <PaymentSuccess />
                  </RequireRole>
                </RequireAuth>
              }
            />

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
              path="/marketplace"
              element={
                <MarketplaceRoute>
                  <DigitalMarketplace />
                </MarketplaceRoute>
              }
            />
            <Route
              path="/meus-produtos"
              element={
                <MarketplaceRoute>
                  <MyDigitalProducts />
                </MarketplaceRoute>
              }
            />

            <Route
              path="/aluno"
              element={
                <StudentRoute>
                  <StudentPortal section="dashboard" />
                </StudentRoute>
              }
            />
            <Route
              path="/aluno/cursos"
              element={
                <StudentRoute>
                  <StudentPortal section="courses" />
                </StudentRoute>
              }
            />
            <Route
              path="/aluno/cursos/:courseId"
              element={
                <StudentRoute>
                  <StudentPortal section="course" />
                </StudentRoute>
              }
            />
            <Route
              path="/aluno/biblioteca"
              element={
                <StudentRoute>
                  <StudentPortal section="library" />
                </StudentRoute>
              }
            />
            <Route
              path="/aluno/produtos"
              element={
                <StudentRoute>
                  <MyDigitalProducts />
                </StudentRoute>
              }
            />
            <Route
              path="/aluno/pedidos"
              element={
                <StudentRoute>
                  <StudentPortal section="orders" />
                </StudentRoute>
              }
            />
            <Route
              path="/aluno/pagamentos"
              element={
                <StudentRoute>
                  <StudentPortal section="payments" />
                </StudentRoute>
              }
            />
            <Route
              path="/aluno/perfil"
              element={
                <StudentRoute>
                  <StudentPortal section="profile" />
                </StudentRoute>
              }
            />
            <Route
              path="/aluno/perfil/editar"
              element={
                <StudentRoute>
                  <EditProfile />
                </StudentRoute>
              }
            />
            <Route
              path="/aluno/historico"
              element={
                <StudentRoute>
                  <StudentPortal section="history" />
                </StudentRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <StudentRoute>
                  <Navigate to="/aluno" replace />
                </StudentRoute>
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
              path="/admin/cursos"
              element={
                <AdminRoute>
                  <CoursesAdmin />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/cursos/novo"
              element={
                <AdminRoute>
                  <CourseEditor />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/cursos/:courseId/editar"
              element={
                <AdminRoute>
                  <CourseEditor />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/cursos/:courseId/preview"
              element={
                <AdminRoute>
                  <CoursePreview />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/cursos/:courseId/curriculo"
              element={
                <AdminRoute>
                  <CourseCurriculum />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/produtos"
              element={
                <AdminRoute>
                  <DigitalProductsAdmin />
                </AdminRoute>
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

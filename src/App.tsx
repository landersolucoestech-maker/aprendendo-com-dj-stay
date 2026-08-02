import { Suspense } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { RouteAccessibility } from "@/accessibility/RouteAccessibility";
import { AuthProvider } from "@/auth/AuthProvider";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { queryClient } from "@/lib/query-client";
import { PublicOnlyRoute } from "@/routing/PublicOnlyRoute";
import { RequireAuth } from "@/routing/RequireAuth";
import { RequireRole } from "@/routing/RequireRole";
import { RoleLandingRedirect } from "@/routing/RoleLandingRedirect";
import { RouteErrorBoundary } from "@/routing/RouteErrorBoundary";
import { RouteLoadingFallback } from "@/routing/RouteLoadingFallback";
import {
  AffiliatesAdmin,
  ContactsAdmin,
  CourseCurriculum,
  CourseEditor,
  CoursePreview,
  CoursesAdmin,
  DigitalProductsAdmin,
  FrontendErrorsAdmin,
  PaymentsAdmin,
  PrivacyRightsAdmin,
  StudentsAdmin,
  SupportAdmin,
} from "@/routing/lazy/admin-pages";
import { AffiliatePortal } from "@/routing/lazy/affiliate-pages";
import {
  AuthCallback,
  ForgotPassword,
  Login,
  Register,
  ResetPassword,
  Verified,
  VerifyEmail,
} from "@/routing/lazy/auth-pages";
import {
  DigitalMarketplace,
  MyDigitalProducts,
  PaymentSuccess,
} from "@/routing/lazy/commerce-pages";
import {
  AccessDenied,
  AffiliateRedirect,
  CertificateValidation,
  Contact,
  Index,
  NotFound,
} from "@/routing/lazy/public-pages";
import {
  Certificates,
  EditProfile,
  Lesson,
  StudentCommunicationPreferences,
  StudentFavorites,
  StudentNotifications,
  StudentPortal,
  StudentPrivacyRights,
  StudentSupport,
} from "@/routing/lazy/student-pages";

const StudentRoute = ({ children }: { children: React.ReactNode }) => (
  <RequireAuth>
    <RequireRole allowedRoles={["aluno"]}>{children}</RequireRole>
  </RequireAuth>
);

const AffiliateRoute = ({ children }: { children: React.ReactNode }) => (
  <RequireAuth>
    <RequireRole allowedRoles={["afiliado"]}>{children}</RequireRole>
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
          <RouteAccessibility>
            <RouteErrorBoundary>
              <Suspense fallback={<RouteLoadingFallback />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/contato" element={<Contact />} />
                  <Route path="/r/:code" element={<AffiliateRedirect />} />
                  <Route path="/certificado" element={<CertificateValidation />} />
                  <Route path="/certificado/:code" element={<CertificateValidation />} />
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

                  <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
                  <Route path="/matricule-se" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
                  <Route path="/esqueceu-senha" element={<PublicOnlyRoute><ForgotPassword /></PublicOnlyRoute>} />

                  <Route path="/portal" element={<RequireAuth><RoleLandingRedirect /></RequireAuth>} />
                  <Route path="/marketplace" element={<MarketplaceRoute><DigitalMarketplace /></MarketplaceRoute>} />
                  <Route path="/meus-produtos" element={<MarketplaceRoute><MyDigitalProducts /></MarketplaceRoute>} />
                  <Route path="/afiliado" element={<AffiliateRoute><AffiliatePortal /></AffiliateRoute>} />

                  <Route path="/aluno" element={<StudentRoute><StudentPortal section="dashboard" /></StudentRoute>} />
                  <Route path="/aluno/cursos" element={<StudentRoute><StudentPortal section="courses" /></StudentRoute>} />
                  <Route path="/aluno/cursos/:courseId" element={<StudentRoute><StudentPortal section="course" /></StudentRoute>} />
                  <Route path="/aluno/biblioteca" element={<StudentRoute><StudentPortal section="library" /></StudentRoute>} />
                  <Route path="/aluno/favoritos" element={<StudentRoute><StudentFavorites /></StudentRoute>} />
                  <Route path="/aluno/certificados" element={<StudentRoute><Certificates /></StudentRoute>} />
                  <Route path="/aluno/produtos" element={<StudentRoute><MyDigitalProducts /></StudentRoute>} />
                  <Route path="/aluno/pedidos" element={<StudentRoute><StudentPortal section="orders" /></StudentRoute>} />
                  <Route path="/aluno/pagamentos" element={<StudentRoute><StudentPortal section="payments" /></StudentRoute>} />
                  <Route path="/aluno/notificacoes" element={<StudentRoute><StudentNotifications /></StudentRoute>} />
                  <Route path="/aluno/suporte" element={<StudentRoute><StudentSupport /></StudentRoute>} />
                  <Route path="/aluno/perfil" element={<StudentRoute><StudentPortal section="profile" /></StudentRoute>} />
                  <Route path="/aluno/perfil/editar" element={<StudentRoute><EditProfile /></StudentRoute>} />
                  <Route path="/aluno/preferencias" element={<StudentRoute><StudentCommunicationPreferences /></StudentRoute>} />
                  <Route path="/aluno/privacidade" element={<StudentRoute><StudentPrivacyRights /></StudentRoute>} />
                  <Route path="/aluno/historico" element={<StudentRoute><StudentPortal section="history" /></StudentRoute>} />
                  <Route path="/dashboard" element={<StudentRoute><Navigate to="/aluno" replace /></StudentRoute>} />
                  <Route path="/aula/:lessonId" element={<RequireAuth><RequireRole allowedRoles={["aluno", "administrador_proprietario"]}><Lesson /></RequireRole></RequireAuth>} />

                  <Route path="/admin/cursos" element={<AdminRoute><CoursesAdmin /></AdminRoute>} />
                  <Route path="/admin/cursos/novo" element={<AdminRoute><CourseEditor /></AdminRoute>} />
                  <Route path="/admin/cursos/:courseId/editar" element={<AdminRoute><CourseEditor /></AdminRoute>} />
                  <Route path="/admin/cursos/:courseId/preview" element={<AdminRoute><CoursePreview /></AdminRoute>} />
                  <Route path="/admin/cursos/:courseId/curriculo" element={<AdminRoute><CourseCurriculum /></AdminRoute>} />
                  <Route path="/admin/produtos" element={<AdminRoute><DigitalProductsAdmin /></AdminRoute>} />
                  <Route path="/admin/pagamentos" element={<AdminRoute><PaymentsAdmin /></AdminRoute>} />
                  <Route path="/admin/afiliados" element={<AdminRoute><AffiliatesAdmin /></AdminRoute>} />
                  <Route path="/admin/alunos" element={<AdminRoute><StudentsAdmin /></AdminRoute>} />
                  <Route path="/admin/contatos" element={<AdminRoute><ContactsAdmin /></AdminRoute>} />
                  <Route path="/admin/suporte" element={<AdminRoute><SupportAdmin /></AdminRoute>} />
                  <Route path="/admin/privacidade" element={<AdminRoute><PrivacyRightsAdmin /></AdminRoute>} />
                  <Route path="/admin/erros" element={<AdminRoute><FrontendErrorsAdmin /></AdminRoute>} />

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
              </Suspense>
            </RouteErrorBoundary>
          </RouteAccessibility>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

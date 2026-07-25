import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import InstructorLayout from "@/components/instructor/InstructorLayout";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "@/pages/Index";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import Dashboard from "@/pages/Dashboard";
import StudentCourses from "@/pages/StudentCourses";
import CourseLearning from "@/pages/CourseLearning";
import Lesson from "@/pages/Lesson";
import Catalog from "@/pages/Catalog";
import Cart from "@/pages/Cart";
import Orders from "@/pages/Orders";
import Support from "@/pages/Support";
import SupportTicket from "@/pages/SupportTicket";
import Contact from "@/pages/Contact";
import EditProfile from "@/pages/EditProfile";
import AccessDenied from "@/pages/AccessDenied";
import PaymentSuccess from "@/pages/PaymentSuccess";
import CertificateVerification from "@/pages/CertificateVerification";
import VerifyEmail from "@/pages/VerifyEmail";
import Verified from "@/pages/Verified";
import NotFound from "@/pages/NotFound";
import InstructorIndex from "@/pages/instructor/InstructorIndex";
import InstructorCourses from "@/pages/instructor/InstructorCourses";
import InstructorCourseEditor from "@/pages/instructor/InstructorCourseEditor";
import InstructorStudents from "@/pages/instructor/InstructorStudents";
import InstructorSales from "@/pages/instructor/InstructorSales";
import InstructorSupport from "@/pages/instructor/InstructorSupport";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/matricule-se" element={<Register />} />
              <Route path="/esqueceu-senha" element={<ForgotPassword />} />
              <Route path="/verificar-email" element={<VerifyEmail />} />
              <Route path="/verificado" element={<Verified />} />
              <Route path="/contato" element={<Contact />} />
              <Route path="/certificado/:code" element={<CertificateVerification />} />
              <Route path="/acesso-negado" element={<AccessDenied />} />

              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/meus-cursos" element={<StudentCourses />} />
                <Route path="/curso/:courseId" element={<CourseLearning />} />
                <Route path="/aula/:lessonId" element={<Lesson />} />
                <Route path="/catalogo" element={<Catalog />} />
                <Route path="/carrinho" element={<Cart />} />
                <Route path="/checkout" element={<Cart />} />
                <Route path="/pedidos" element={<Orders />} />
                <Route path="/suporte" element={<Support />} />
                <Route path="/suporte/:ticketId" element={<SupportTicket />} />
                <Route path="/editar-perfil" element={<EditProfile />} />
                <Route path="/pagamento-sucesso" element={<PaymentSuccess />} />
              </Route>

              <Route element={<ProtectedRoute roles={["instructor", "support", "admin", "owner"]} />}>
                <Route path="/instrutor" element={<InstructorLayout />}>
                  <Route index element={<InstructorIndex />} />
                  <Route path="atendimento" element={<InstructorSupport />} />
                  <Route path="atendimento/:ticketId" element={<SupportTicket staff />} />
                  <Route element={<ProtectedRoute roles={["instructor", "admin", "owner"]} />}>
                    <Route path="cursos" element={<InstructorCourses />} />
                    <Route path="cursos/novo" element={<InstructorCourses />} />
                    <Route path="cursos/:courseId" element={<InstructorCourseEditor />} />
                    <Route path="alunos" element={<InstructorStudents />} />
                    <Route path="vendas" element={<InstructorSales />} />
                  </Route>
                </Route>
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

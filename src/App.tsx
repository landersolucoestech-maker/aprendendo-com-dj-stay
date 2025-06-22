
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import Lesson from "./pages/Lesson";
import Contact from "./pages/Contact";
import EditProfile from "./pages/EditProfile";
import AccessDenied from "./pages/AccessDenied";
import PaymentSuccess from "./pages/PaymentSuccess";
import VerifyEmail from "./pages/VerifyEmail";
import Verified from "./pages/Verified";
import NotFound from "./pages/NotFound";
import Payment from "./pages/Payment";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/matricule-se" element={<Register />} />
          <Route path="/esqueceu-senha" element={<ForgotPassword />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/aula/:lessonId" element={<Lesson />} />
          <Route path="/pagamento" element={<Payment />} />
          <Route path="/contato" element={<Contact />} />
          <Route path="/editar-perfil" element={<EditProfile />} />
          <Route path="/acesso-negado" element={<AccessDenied />} />
          <Route path="/pagamento-sucesso" element={<PaymentSuccess />} />
          <Route path="/verificar-email" element={<VerifyEmail />} />
          <Route path="/verificado" element={<Verified />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

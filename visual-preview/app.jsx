import React, { Suspense, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthContext } from "@/auth/auth-context";
import { AdminShell } from "@/app/shells/AdminShell";
import { AffiliateShell } from "@/app/shells/AffiliateShell";
import { AdminNavigation } from "@/components/admin/AdminNavigation";
import "@/index.css";

import Index from "@/pages/Index";
import Contact from "@/pages/Contact";
import CertificateValidation from "@/pages/CertificateValidation";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import VerifyEmail from "@/pages/VerifyEmail";
import Verified from "@/pages/Verified";
import AccessDenied from "@/pages/AccessDenied";
import NotFound from "@/pages/NotFound";

import StudentPortal from "@/pages/student/StudentPortalRouter";
import StudentFavorites from "@/pages/student/StudentFavorites";
import Certificates from "@/pages/student/Certificates";
import StudentNotifications from "@/pages/student/StudentNotifications";
import StudentSupport from "@/pages/student/StudentSupport";
import StudentCommunicationPreferences from "@/pages/student/StudentCommunicationPreferences";
import StudentPrivacyRights from "@/pages/student/StudentPrivacyRights";
import EditProfile from "@/pages/EditProfile";
import Lesson from "@/pages/Lesson";

import AdminDashboard from "@/pages/admin/AdminDashboard";
import CoursesAdmin from "@/pages/admin/CoursesAdmin";
import CourseEditor from "@/pages/admin/CourseEditor";
import CoursePreview from "@/pages/admin/CoursePreview";
import CourseCurriculum from "@/pages/admin/CourseCurriculum";
import DigitalProductsAdmin from "@/pages/admin/DigitalProductsAdmin";
import PaymentsAdmin from "@/pages/admin/PaymentsAdmin";
import AffiliatesAdmin from "@/pages/admin/AffiliatesAdmin";
import StudentsAdmin from "@/pages/admin/StudentsAdmin";
import AcademicAnalyticsAdmin from "@/pages/admin/AcademicAnalyticsAdmin";
import ContactsAdmin from "@/pages/admin/ContactsAdmin";
import SupportAdmin from "@/pages/admin/SupportAdmin";
import PrivacyRightsAdmin from "@/pages/admin/PrivacyRightsAdmin";
import FrontendErrorsAdmin from "@/pages/admin/FrontendErrorsAdmin";

import AffiliatePortal from "@/pages/affiliate/AffiliatePortal";
import CourseStorefront from "@/pages/marketplace/CourseStorefront";
import DigitalMarketplace from "@/pages/marketplace/DigitalMarketplace";
import MyDigitalProducts from "@/pages/student/MyDigitalProducts";
import PaymentSuccess from "@/pages/PaymentSuccess";

import { SURFACES } from "./surfaces.js";

const surface = globalThis.__VISUAL_PREVIEW_ONLY__.surface;
const user = {
  id: "00000000-0000-4000-8000-000000000001",
  aud: "authenticated",
  role: "authenticated",
  email: "preview@dica.local",
  email_confirmed_at: "2026-08-08T12:00:00.000Z",
  phone: "",
  confirmed_at: "2026-08-08T12:00:00.000Z",
  last_sign_in_at: "2026-08-08T12:00:00.000Z",
  app_metadata: {},
  user_metadata: { full_name: "Preview Dica de Cria", name: "Preview Dica de Cria" },
  identities: [],
  created_at: "2026-08-08T12:00:00.000Z",
  updated_at: "2026-08-08T12:00:00.000Z",
};
const authenticated = surface.area !== "public" || ["public/reset-password", "public/verified"].includes(surface.slug);
const authValue = {
  session: authenticated ? { access_token: "VISUAL_PREVIEW_ONLY", refresh_token: "VISUAL_PREVIEW_ONLY", expires_in: 3600, token_type: "bearer", user } : null,
  user: authenticated ? user : null,
  status: "ready",
  errorMessage: null,
  signOut: async () => undefined,
  refreshSession: async () => undefined,
};
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: Infinity, refetchOnWindowFocus: false }, mutations: { retry: false } },
});

function PublicSurface() {
  switch (surface.component) {
    case "Index": return <Index />;
    case "Contact": return <Contact />;
    case "CertificateValidation": return <CertificateValidation />;
    case "Login": return <Login />;
    case "Register": return <Register />;
    case "ForgotPassword": return <ForgotPassword />;
    case "ResetPassword": return <ResetPassword />;
    case "VerifyEmail": return <VerifyEmail />;
    case "Verified": return <Verified />;
    case "AccessDenied": return <AccessDenied />;
    default: return <NotFound />;
  }
}

function StudentSurface() {
  const [component, mode] = surface.component.split(":");
  if (component === "StudentPortal") return <StudentPortal section={mode} />;
  if (component === "StudentFavorites") return <StudentFavorites />;
  if (component === "Certificates") return <Certificates />;
  if (component === "StudentNotifications") return <StudentNotifications />;
  if (component === "StudentSupport") return <StudentSupport />;
  if (component === "StudentCommunicationPreferences") return <StudentCommunicationPreferences />;
  if (component === "StudentPrivacyRights") return <StudentPrivacyRights />;
  if (component === "EditProfile") return <EditProfile studentPortal={mode === "student"} />;
  if (component === "MyDigitalProducts") return <MyDigitalProducts studentPortal />;
  if (component === "Lesson") return <Lesson />;
  return <NotFound />;
}

function AdminBody() {
  switch (surface.component) {
    case "AdminDashboard": return <AdminDashboard />;
    case "CoursesAdmin": return <CoursesAdmin />;
    case "CourseEditor": return <CourseEditor />;
    case "CoursePreview": return <CoursePreview />;
    case "CourseCurriculum": return <CourseCurriculum />;
    case "DigitalProductsAdmin": return <DigitalProductsAdmin />;
    case "PaymentsAdmin": return <PaymentsAdmin />;
    case "AffiliatesAdmin": return <AffiliatesAdmin />;
    case "StudentsAdmin": return <StudentsAdmin />;
    case "AcademicAnalyticsAdmin": return <AcademicAnalyticsAdmin />;
    case "ContactsAdmin": return <ContactsAdmin />;
    case "SupportAdmin": return <SupportAdmin />;
    case "PrivacyRightsAdmin": return <PrivacyRightsAdmin />;
    case "FrontendErrorsAdmin": return <FrontendErrorsAdmin />;
    default: return <NotFound />;
  }
}
const AdminSurface = () => <AdminShell navigation={<AdminNavigation />}><AdminBody /></AdminShell>;
const AffiliateSurface = () => <AffiliateShell><AffiliatePortal /></AffiliateShell>;

function CommerceSurface() {
  switch (surface.component) {
    case "CourseStorefront": return <CourseStorefront />;
    case "DigitalMarketplace": return <DigitalMarketplace />;
    case "MyDigitalProducts": return <MyDigitalProducts />;
    case "PaymentSuccess": return <PaymentSuccess />;
    default: return <NotFound />;
  }
}

const groupLabels = { public: "Público", student: "Aluno", admin: "Admin", affiliate: "Afiliado", commerce: "Comercial" };
function PreviewNavigator() {
  const [open, setOpen] = useState(false);
  const grouped = useMemo(() => SURFACES.reduce((result, item) => {
    (result[item.area] ??= []).push(item);
    return result;
  }, {}), []);
  return (
    <div data-preview-navigator className="fixed right-3 top-3 z-[9999]">
      <button type="button" onClick={() => setOpen((value) => !value)} className="rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground shadow-lg" aria-expanded={open}>
        Preview · {surface.slug}
      </button>
      {open ? (
        <div className="mt-2 max-h-[80vh] w-[min(92vw,420px)] overflow-auto rounded-2xl border border-border bg-background p-3 text-foreground shadow-2xl">
          {Object.entries(grouped).map(([area, items]) => (
            <section key={area} className="mb-4 last:mb-0">
              <p className="mb-2 px-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">{groupLabels[area]}</p>
              <div className="grid gap-1">
                {items.map((item) => (
                  <a key={item.slug} href={`/aprendendo-com-dj-stay/visual-preview/${item.slug}/`} className={`rounded-lg px-3 py-2 text-sm hover:bg-muted ${item.slug === surface.slug ? "bg-muted font-semibold" : ""}`}>
                    {item.slug.split("/")[1]}
                  </a>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function App() {
  useEffect(() => {
    document.documentElement.dataset.visualPreviewReady = "true";
    document.body.dataset.previewSurface = surface.slug;
    const stop = (event) => {
      const target = event.target;
      if (target instanceof HTMLButtonElement && (target.type === "submit" || /comprar|pagar|excluir|remover|publicar|arquivar/i.test(target.textContent || ""))) event.preventDefault();
    };
    document.addEventListener("click", stop, true);
    return () => document.removeEventListener("click", stop, true);
  }, []);

  let content;
  if (surface.area === "public") content = <PublicSurface />;
  else if (surface.area === "student") content = <StudentSurface />;
  else if (surface.area === "admin") content = <AdminSurface />;
  else if (surface.area === "affiliate") content = <AffiliateSurface />;
  else content = <CommerceSurface />;

  return <><PreviewNavigator /><Suspense fallback={<div className="min-h-screen p-8">Carregando componente real…</div>}>{content}</Suspense></>;
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <MemoryRouter initialEntries={[surface.route]}>
          <AuthContext.Provider value={authValue}>
            <App />
          </AuthContext.Provider>
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);

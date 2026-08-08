import React, { Suspense, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router";
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
const COURSE_ID = "11111111-1111-4111-8111-111111111111";
const MODULE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const LESSON_ID = "22222222-2222-4222-8222-222222222222";
const now = "2026-08-08T12:00:00.000Z";
const user = {
  id: "00000000-0000-4000-8000-000000000001",
  aud: "authenticated",
  role: "authenticated",
  email: "preview@dica.local",
  email_confirmed_at: now,
  phone: "",
  confirmed_at: now,
  last_sign_in_at: now,
  app_metadata: {},
  user_metadata: { full_name: "Preview Dica de Cria", name: "Preview Dica de Cria" },
  identities: [],
  created_at: now,
  updated_at: now,
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
queryClient.setQueryData(["user-profile"], {
  id: "33333333-3333-4333-8333-333333333333",
  user_id: user.id,
  avatar_asset_id: null,
  created_at: now,
  updated_at: now,
  avatarSignedUrl: null,
});
const previewLesson = {
  id: LESSON_ID,
  title: "Aula 1 · Introdução",
  description: "Aula navegável do preview.",
  durationMinutes: 12,
  durationLabel: "12 min",
  order: 1,
  moduleId: MODULE_ID,
  completionMode: "manual",
  completionPercent: null,
  contentKind: "video",
};
queryClient.setQueryData(["modules", COURSE_ID], [{
  id: MODULE_ID,
  title: "Módulo 1 · Fundamentos",
  description: "Conteúdo VISUAL_PREVIEW_ONLY para permitir navegação real entre curso, módulo e aula.",
  order: 1,
  lessons: [{ id: LESSON_ID, title: previewLesson.title, description: previewLesson.description, durationMinutes: 12, durationLabel: "12 min", order: 1 }],
}]);
queryClient.setQueryData(["lessons"], [previewLesson]);
queryClient.setQueryData(["user-progress"], []);

const adminCourse = {
  id: COURSE_ID,
  title: "Curso Preview Navegável",
  slug: "curso-preview-navegavel",
  status: "published",
  access_duration_days: 365,
  short_description: "Curso VISUAL_PREVIEW_ONLY para validar o CMS sem backend real.",
  description: "Curso isolado do preview navegável.",
  category: "DJ",
  language_code: "pt-BR",
  level: "all_levels",
  objectives: ["Validar navegação do CMS"],
  prerequisites: [],
  cover_asset_id: null,
  thumbnail_asset_id: null,
  price_amount: 199,
  currency_code: "BRL",
  promotional_price_amount: 149,
  promotion_starts_at: null,
  promotion_ends_at: null,
  availability_starts_at: null,
  availability_ends_at: null,
  completion_mode: "all_required_lessons",
  completion_required_percent: 100,
  certificate_enabled: true,
  certificate_min_completion_percent: 100,
  release_mode: "immediate",
  release_at: null,
  drip_interval_days: null,
  affiliate_eligible: true,
  preview_enabled: true,
  published_at: now,
  unpublished_at: null,
  archived_at: null,
  deleted_at: null,
  duplicated_from_course_id: null,
  created_by_user_id: null,
  updated_by_user_id: null,
  version: 1,
  created_at: now,
  updated_at: now,
};
const adminModule = {
  id: MODULE_ID,
  course_id: COURSE_ID,
  titulo: "Módulo 1 · Fundamentos",
  descricao: "Módulo VISUAL_PREVIEW_ONLY",
  ordem: 0,
  status: "published",
  obrigatorio: true,
  release_mode: "immediate",
  release_at: null,
  drip_delay_days: null,
  preview_enabled: true,
  version: 1,
  duplicated_from_module_id: null,
  created_by_user_id: null,
  updated_by_user_id: null,
  archived_at: null,
  deleted_at: null,
  created_at: now,
  updated_at: now,
};
const adminLesson = {
  id: LESSON_ID,
  modulo_id: MODULE_ID,
  titulo: "Aula 1 · Introdução",
  descricao: "Aula navegável do preview.",
  conteudo_texto: null,
  ordem: 0,
  duracao: 720,
  status: "published",
  content_kind: "video",
  audio_asset_id: null,
  obrigatoria: true,
  completion_mode: "manual",
  completion_percent: null,
  preview_enabled: true,
  release_mode: "immediate",
  release_at: null,
  drip_delay_days: null,
  availability_starts_at: null,
  availability_ends_at: null,
  version: 1,
  duplicated_from_lesson_id: null,
  created_by_user_id: null,
  updated_by_user_id: null,
  archived_at: null,
  deleted_at: null,
  created_at: now,
  updated_at: now,
};
queryClient.setQueryData(["admin", "courses"], [adminCourse]);
queryClient.setQueryData(["admin", "courses", COURSE_ID], adminCourse);
queryClient.setQueryData(["admin", "curriculum", COURSE_ID], {
  modules: [adminModule],
  lessons: [adminLesson],
  modulePrerequisites: [],
  lessonPrerequisites: [],
  media: [],
  assets: [],
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

const previewRoutePattern = () => {
  if (["student/course", "student/modules", "student/lessons"].includes(surface.slug)) return "/aluno/cursos/:courseId";
  if (["student/lesson-video", "student/lesson-text"].includes(surface.slug)) return "/aula/:lessonId";
  if (surface.slug === "admin/course-edit") return "/admin/cursos/:courseId/editar";
  if (surface.slug === "admin/course-preview") return "/admin/cursos/:courseId/preview";
  if (["admin/curriculum", "admin/modules", "admin/lessons", "admin/module-editor", "admin/lesson-editor", "admin/assets"].includes(surface.slug)) return "/admin/cursos/:courseId/curriculo";
  return surface.route.split(/[?#]/)[0] || "/";
};

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

  return <><PreviewNavigator /><Suspense fallback={<div className="min-h-screen p-8">Carregando componente real…</div>}><Routes><Route path={previewRoutePattern()} element={content} /></Routes></Suspense></>;
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

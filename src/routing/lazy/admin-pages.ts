import { lazy } from "react";

export const AdminDashboard = lazy(
  () => import("@/pages/admin/AdminDashboard"),
);
export const AffiliatesAdmin = lazy(
  () => import("@/pages/admin/AffiliatesAdmin"),
);
export const ContactsAdmin = lazy(() => import("@/pages/admin/ContactsAdmin"));
export const CourseCurriculum = lazy(
  () => import("@/pages/admin/CourseCurriculum"),
);
export const CourseEditor = lazy(() => import("@/pages/admin/CourseEditor"));
export const CoursePreview = lazy(() => import("@/pages/admin/CoursePreview"));
export const CoursesAdmin = lazy(() => import("@/pages/admin/CoursesAdmin"));
export const DigitalProductsAdmin = lazy(
  () => import("@/pages/admin/DigitalProductsAdmin"),
);
export const FrontendErrorsAdmin = lazy(
  () => import("@/pages/admin/FrontendErrorsAdminWithHistory"),
);
export const PaymentsAdmin = lazy(() => import("@/pages/admin/PaymentsAdmin"));
export const PrivacyRightsAdmin = lazy(
  () => import("@/pages/admin/PrivacyRightsAdmin"),
);
export const StudentsAdmin = lazy(() => import("@/pages/admin/StudentsAdmin"));
export const SupportAdmin = lazy(() => import("@/pages/admin/SupportAdmin"));

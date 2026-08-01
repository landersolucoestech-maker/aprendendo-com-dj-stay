import { lazy } from "react";

export const StudentPortal = lazy(
  () => import("@/pages/student/StudentPortalRouter"),
);
export const StudentSupport = lazy(
  () => import("@/pages/student/StudentSupport"),
);
export const StudentNotifications = lazy(
  () => import("@/pages/student/StudentNotifications"),
);
export const Certificates = lazy(() => import("@/pages/student/Certificates"));
export const EditProfile = lazy(() => import("@/pages/EditProfile"));
export const Lesson = lazy(() => import("@/pages/Lesson"));

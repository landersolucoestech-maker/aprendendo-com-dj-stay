import { lazy } from "react";

export const Index = lazy(() => import("@/pages/Index"));
export const Contact = lazy(() => import("@/pages/Contact"));
export const AffiliateRedirect = lazy(() => import("@/pages/AffiliateRedirect"));
export const CertificateValidation = lazy(
  () => import("@/pages/CertificateValidation"),
);
export const AccessDenied = lazy(() => import("@/pages/AccessDenied"));
export const NotFound = lazy(() => import("@/pages/NotFound"));

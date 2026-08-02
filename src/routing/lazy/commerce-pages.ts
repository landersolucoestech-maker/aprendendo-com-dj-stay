import { lazy } from "react";

export const CourseStorefront = lazy(
  () => import("@/pages/marketplace/CourseStorefront"),
);
export const DigitalMarketplace = lazy(
  () => import("@/pages/marketplace/DigitalMarketplace"),
);
export const MyDigitalProducts = lazy(
  () => import("@/pages/student/MyDigitalProducts"),
);
export const PaymentSuccess = lazy(() => import("@/pages/PaymentSuccess"));

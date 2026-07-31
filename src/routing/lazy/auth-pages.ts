import { lazy } from "react";

export const AuthCallback = lazy(() => import("@/pages/AuthCallback"));
export const Login = lazy(() => import("@/pages/Login"));
export const Register = lazy(() => import("@/pages/Register"));
export const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
export const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
export const VerifyEmail = lazy(() => import("@/pages/VerifyEmail"));
export const Verified = lazy(() => import("@/pages/Verified"));

import type { PropsWithChildren } from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "@/auth/use-auth";
import { AuthLoadingScreen } from "./AuthLoadingScreen";

export function PublicOnlyRoute({ children }: PropsWithChildren) {
  const { session, status } = useAuth();

  if (status === "loading") {
    return <AuthLoadingScreen />;
  }

  if (session) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

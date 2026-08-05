import type { PropsWithChildren } from "react";
import { Navigate } from "react-router";

import { useAuth } from "@/auth/use-auth";
import { AuthLoadingScreen } from "./AuthLoadingScreen";

export function PublicOnlyRoute({ children }: PropsWithChildren) {
  const { session, status } = useAuth();

  if (status === "loading") {
    return <AuthLoadingScreen />;
  }

  if (session) {
    return <Navigate to="/portal" replace />;
  }

  return children;
}

import type { PropsWithChildren } from "react";
import { Navigate, useLocation } from "react-router";

import { useAuth } from "@/auth/use-auth";
import { AuthLoadingScreen } from "./AuthLoadingScreen";

export function RequireAuth({ children }: PropsWithChildren) {
  const { session, status } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return <AuthLoadingScreen />;
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

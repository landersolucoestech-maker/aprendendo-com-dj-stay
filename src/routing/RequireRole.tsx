import type { PropsWithChildren } from "react";
import { Navigate } from "react-router";

import type { AppRole } from "@/contracts/authorization";
import { useCurrentRole } from "@/hooks/useCurrentRole";
import { getErrorMessage } from "@/lib/error-message";
import { AuthLoadingScreen } from "./AuthLoadingScreen";

interface RequireRoleProps extends PropsWithChildren {
  readonly allowedRoles: readonly AppRole[];
}

export function RequireRole({ allowedRoles, children }: RequireRoleProps) {
  const roleQuery = useCurrentRole();

  if (roleQuery.isLoading) {
    return <AuthLoadingScreen />;
  }

  if (roleQuery.error || !roleQuery.data) {
    return (
      <Navigate
        to="/acesso-negado"
        replace
        state={{
          reason: getErrorMessage(
            roleQuery.error,
            "Não foi possível validar o papel da sua conta.",
          ),
        }}
      />
    );
  }

  if (!allowedRoles.includes(roleQuery.data.role)) {
    return <Navigate to="/acesso-negado" replace />;
  }

  return children;
}

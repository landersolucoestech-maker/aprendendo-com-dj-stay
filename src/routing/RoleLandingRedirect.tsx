import { Navigate } from "react-router-dom";

import { useCurrentRole } from "@/hooks/useCurrentRole";
import { getErrorMessage } from "@/lib/error-message";
import { AuthLoadingScreen } from "./AuthLoadingScreen";

export function RoleLandingRedirect() {
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
            "Não foi possível identificar o destino da sua conta.",
          ),
        }}
      />
    );
  }

  if (roleQuery.data.role === "administrador_proprietario") {
    return <Navigate to="/admin/cursos" replace />;
  }

  if (roleQuery.data.role === "afiliado") {
    return <Navigate to="/editar-perfil" replace />;
  }

  return <Navigate to="/aluno" replace />;
}

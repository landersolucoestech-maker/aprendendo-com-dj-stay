import { useMemo, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router";

import { getUserMetadataProfile } from "@/auth/user-metadata";
import { useAuth } from "@/auth/use-auth";
import { AuthenticatedShell } from "@/shared/navigation/AuthenticatedShell";

interface AdminShellProps {
  readonly navigation: ReactNode;
  readonly children: ReactNode;
}

const getAdminHeaderTitle = (pathname: string): string => {
  if (pathname === "/admin") return "Dashboard";
  if (pathname === "/admin/cursos") return "Cursos";
  if (pathname.startsWith("/admin/cursos/")) return "Curso";
  if (pathname === "/admin/produtos") return "Produtos";
  if (pathname === "/admin/alunos") return "Alunos";
  if (pathname === "/admin/academico") return "Acadêmico";
  if (pathname === "/admin/pagamentos") return "Pagamentos";
  if (pathname === "/admin/afiliados") return "Afiliados";
  if (pathname === "/admin/contatos") return "Contatos";
  if (pathname === "/admin/suporte") return "Suporte";
  if (pathname === "/admin/privacidade") return "Privacidade";
  if (pathname === "/admin/erros") return "Erros";
  return "Administração";
};

export const AdminShell = ({ navigation, children }: AdminShellProps) => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const displayName = useMemo(() => {
    if (!user) return "Administrador";
    try {
      return getUserMetadataProfile(user).fullName;
    } catch {
      return user.email ?? "Administrador";
    }
  }, [user]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      navigate("/login", { replace: true });
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <AuthenticatedShell
      context="admin"
      portalLabel="Administração"
      homePath="/admin"
      headerTitle={getAdminHeaderTitle(location.pathname)}
      headerDescription="Operação, conteúdo, financeiro e governança."
      displayName={displayName}
      email={user?.email ?? ""}
      isSigningOut={isSigningOut}
      onSignOut={() => void handleSignOut()}
      navigation={navigation}
    >
      {children}
    </AuthenticatedShell>
  );
};

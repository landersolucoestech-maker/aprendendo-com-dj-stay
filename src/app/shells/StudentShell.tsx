import type { ReactNode } from "react";
import { useLocation } from "react-router";

import { AuthenticatedShell } from "@/shared/navigation/AuthenticatedShell";

interface StudentShellProps {
  readonly displayName: string;
  readonly email: string;
  readonly isSigningOut: boolean;
  readonly onSignOut: () => void;
  readonly navigation: ReactNode;
  readonly mobileNavigation: ReactNode;
  readonly brand: ReactNode;
  readonly children: ReactNode;
}

const getStudentHeaderTitle = (pathname: string): string => {
  if (pathname === "/aluno") return "Início";
  if (pathname.startsWith("/aluno/cursos")) return "Meus cursos";
  if (pathname === "/aluno/biblioteca") return "Biblioteca";
  if (pathname === "/aluno/favoritos") return "Favoritos";
  if (pathname === "/aluno/certificados") return "Certificados";
  if (pathname === "/aluno/historico") return "Histórico";
  if (pathname === "/aluno/produtos") return "Meus produtos";
  if (pathname === "/aluno/pedidos") return "Pedidos";
  if (pathname === "/aluno/pagamentos") return "Pagamentos";
  if (pathname === "/aluno/notificacoes") return "Notificações";
  if (pathname === "/aluno/suporte") return "Suporte";
  if (pathname.startsWith("/aluno/perfil")) return "Perfil";
  if (pathname === "/aluno/preferencias") return "Preferências";
  if (pathname === "/aluno/privacidade") return "Privacidade";
  return "Portal do Aluno";
};

export const StudentShell = ({
  displayName,
  email,
  isSigningOut,
  onSignOut,
  navigation,
  mobileNavigation,
  brand,
  children,
}: StudentShellProps) => {
  const location = useLocation();

  return (
    <AuthenticatedShell
      context="course"
      portalLabel="Portal do Aluno"
      homePath="/aluno"
      headerTitle={getStudentHeaderTitle(location.pathname)}
      headerDescription="Aprendizado, compras e conta em um único contexto."
      displayName={displayName}
      email={email}
      isSigningOut={isSigningOut}
      onSignOut={onSignOut}
      navigation={navigation}
      mobileNavigation={mobileNavigation}
      brand={brand}
    >
      {children}
    </AuthenticatedShell>
  );
};

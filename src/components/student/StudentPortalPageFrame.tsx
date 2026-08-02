import { useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import { getUserMetadataProfile } from "@/auth/user-metadata";
import { useAuth } from "@/auth/use-auth";
import { StudentPortalShell } from "@/components/student/StudentPortalShell";
import { PageState } from "@/components/ui/page-state";

interface StudentPortalPageFrameProps {
  readonly children: ReactNode;
}

export const StudentPortalPageFrame = ({
  children,
}: StudentPortalPageFrameProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const displayName = useMemo(() => {
    if (!user) return "Aluno";

    try {
      return getUserMetadataProfile(user).fullName;
    } catch {
      return user.email ?? "Aluno";
    }
  }, [user]);

  const handleSignOut = async (): Promise<void> => {
    setIsSigningOut(true);
    try {
      await signOut();
      navigate("/login", { replace: true });
    } finally {
      setIsSigningOut(false);
    }
  };

  if (!user) {
    return (
      <PageState
        variant="loading"
        title="Validando conta"
        description="Confirmando a sessão do aluno."
      />
    );
  }

  return (
    <StudentPortalShell
      displayName={displayName}
      email={user.email ?? ""}
      isSigningOut={isSigningOut}
      onSignOut={() => void handleSignOut()}
    >
      {children}
    </StudentPortalShell>
  );
};

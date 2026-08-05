import { LogOut, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router";

import { useAuth } from "@/auth/use-auth";
import { AppPageShell } from "@/components/layout/AppPageShell";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/error-message";

interface AdminCourseLayoutProps {
  readonly title: string;
  readonly description: string;
  readonly actions?: ReactNode;
  readonly children: ReactNode;
}

export const AdminCourseLayout = ({
  title,
  description,
  actions,
  children,
}: AdminCourseLayoutProps) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/", { replace: true });
    } catch (error: unknown) {
      toast({
        title: "Não foi possível sair",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  return (
    <AppPageShell
      context="admin"
      eyebrow="Administração"
      title={title}
      description={description}
      actions={
        <>
          {actions}
          <Button asChild variant="outline">
            <Link to="/portal">
              <UserRound className="mr-2 h-4 w-4" aria-hidden="true" />
              Portal
            </Link>
          </Button>
          <Button variant="ghost" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
            Sair
          </Button>
        </>
      }
    >
      {children}
    </AppPageShell>
  );
};

import { BookOpen, LogOut, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "@/auth/use-auth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/error-message";

interface AdminCourseLayoutProps {
  readonly title: string;
  readonly description: string;
  readonly actions?: ReactNode;
  readonly children: ReactNode;
}

export const AdminCourseLayout = ({ title, description, actions, children }: AdminCourseLayoutProps) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/", { replace: true });
    } catch (error: unknown) {
      toast({ title: "Não foi possível sair", description: getErrorMessage(error), variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10 bg-gray-950/95">
        <div className="container mx-auto flex flex-col gap-4 px-4 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link to="/admin/cursos" className="inline-flex items-center gap-2 text-sm text-purple-300 hover:text-purple-200">
              <BookOpen className="h-4 w-4" /> CMS de cursos
            </Link>
            <h1 className="mt-2 text-3xl font-bold">{title}</h1>
            <p className="mt-1 max-w-3xl text-sm text-gray-400">{description}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {actions}
            <Button variant="outline" onClick={() => navigate("/dashboard")} className="border-white/20 bg-transparent">
              <UserRound className="mr-2 h-4 w-4" /> Portal
            </Button>
            <Button variant="ghost" onClick={handleLogout}><LogOut className="mr-2 h-4 w-4" /> Sair</Button>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
};

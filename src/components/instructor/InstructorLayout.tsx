import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { BarChart3, BookOpen, GraduationCap, Headphones, LogOut, Receipt, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export default function InstructorLayout() {
  const { profile, signOut, hasRole } = useAuth();
  const navigate = useNavigate();
  const canManageCourses = hasRole("instructor", "admin", "owner");
  const links = [
    ...(canManageCourses ? [
      { to: "/instrutor", label: "Visão geral", icon: BarChart3, end: true },
      { to: "/instrutor/cursos", label: "Cursos", icon: BookOpen, end: false },
      { to: "/instrutor/alunos", label: "Alunos", icon: Users, end: false },
      { to: "/instrutor/vendas", label: "Vendas", icon: Receipt, end: false },
    ] : []),
    { to: "/instrutor/atendimento", label: "Atendimento", icon: Headphones, end: false },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-black text-white lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="border-r border-white/10 bg-gray-950 p-5 lg:min-h-screen">
        <button type="button" onClick={() => navigate(canManageCourses ? "/instrutor" : "/instrutor/atendimento")} className="flex items-center gap-3 mb-8 text-left">
          <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center"><GraduationCap className="w-6 h-6" /></div>
          <div><strong className="block gradient-text">{canManageCourses ? "CMS do Instrutor" : "Central de Suporte"}</strong><span className="text-xs text-gray-400">Aprendendo com DJ Stay</span></div>
        </button>

        <nav className="grid gap-2">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${isActive ? "bg-white/15 text-white" : "text-gray-400 hover:bg-white/5 hover:text-white"}`}>
              <Icon className="w-4 h-4" />{label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-10 border-t border-white/10 pt-5">
          <p className="text-sm font-medium truncate">{profile?.full_name ?? "Usuário"}</p>
          <div className="grid gap-2 mt-3">
            <Button variant="outline" className="justify-start border-white/20 bg-transparent" onClick={() => navigate("/dashboard")}>Área do aluno</Button>
            <Button variant="ghost" className="justify-start" onClick={handleSignOut}><LogOut className="w-4 h-4 mr-2" />Sair</Button>
          </div>
        </div>
      </aside>
      <main className="min-w-0"><Outlet /></main>
    </div>
  );
}

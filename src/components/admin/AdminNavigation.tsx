import {
  Banknote,
  BarChart3,
  BookOpen,
  Boxes,
  Bug,
  GraduationCap,
  HandCoins,
  LayoutDashboard,
  LifeBuoy,
  MessagesSquare,
  ShieldCheck,
} from "lucide-react";
import { NavLink } from "react-router";

import { cn } from "@/lib/utils";
import { useAuthenticatedShellNavigation } from "@/shared/navigation/AuthenticatedShell";

const adminNavigation = [
  { to: "/admin", label: "Visão geral", icon: LayoutDashboard },
  { to: "/admin/cursos", label: "Cursos", icon: BookOpen },
  { to: "/admin/produtos", label: "Produtos", icon: Boxes },
  { to: "/admin/alunos", label: "Alunos", icon: GraduationCap },
  { to: "/admin/academico", label: "Acadêmico", icon: BarChart3 },
  { to: "/admin/pagamentos", label: "Pagamentos", icon: Banknote },
  { to: "/admin/afiliados", label: "Afiliados", icon: HandCoins },
  { to: "/admin/contatos", label: "Contatos", icon: MessagesSquare },
  { to: "/admin/suporte", label: "Suporte", icon: LifeBuoy },
  { to: "/admin/privacidade", label: "Privacidade", icon: ShieldCheck },
  { to: "/admin/erros", label: "Erros", icon: Bug },
] as const;

const adminGroupByPath = {
  "/admin": "VISÃO GERAL",
  "/admin/cursos": "CONTEÚDO",
  "/admin/produtos": "CONTEÚDO",
  "/admin/alunos": "ACADÊMICO",
  "/admin/academico": "ACADÊMICO",
  "/admin/pagamentos": "FINANCEIRO",
  "/admin/afiliados": "FINANCEIRO",
  "/admin/contatos": "RELACIONAMENTO",
  "/admin/suporte": "RELACIONAMENTO",
  "/admin/privacidade": "GOVERNANÇA",
  "/admin/erros": "GOVERNANÇA",
} as const;

const visibleAdminNavigation = adminNavigation.filter((item) => item.to !== "/admin/erros");
const adminGroups = ["VISÃO GERAL", "CONTEÚDO", "ACADÊMICO", "FINANCEIRO", "RELACIONAMENTO", "GOVERNANÇA"] as const;

export const AdminNavigation = () => {
  const { collapsed, closeNavigation } = useAuthenticatedShellNavigation();
  return (
    <nav aria-label="Navegação administrativa" className="flex h-full flex-col gap-5 overflow-x-auto overflow-y-auto pb-2">
      {adminGroups.map((group) => {
        const items = visibleAdminNavigation.filter((item) => adminGroupByPath[item.to] === group);
        if (items.length === 0) return null;
        return (
          <div key={group}>
            {!collapsed ? <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{group}</p> : null}
            <div className="space-y-1">
              {items.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/admin"}
                  aria-label={collapsed ? (to === "/admin" ? "Dashboard" : label) : undefined}
                  onClick={closeNavigation}
                  className={({ isActive }) => cn(
                    "flex min-h-11 items-center rounded-xl text-sm font-medium transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
                    collapsed ? "justify-center px-2" : "gap-3 px-3",
                    isActive ? "bg-admin/15 text-admin" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {!collapsed ? <span>{to === "/admin" ? "Dashboard" : label}</span> : null}
                </NavLink>
              ))}
            </div>
          </div>
        );
      })}
    </nav>
  );
};

import {
  Banknote,
  BookOpen,
  Boxes,
  Bug,
  GraduationCap,
  HandCoins,
  LayoutDashboard,
  LifeBuoy,
  MessagesSquare,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { NavLink } from "react-router-dom";

import { cn } from "@/lib/utils";

const adminNavigation = [
  { to: "/admin", label: "Visão geral", icon: LayoutDashboard },
  { to: "/admin/cursos", label: "Cursos", icon: BookOpen },
  { to: "/admin/produtos", label: "Produtos", icon: Boxes },
  { to: "/admin/pagamentos", label: "Pagamentos", icon: Banknote },
  { to: "/admin/afiliados", label: "Afiliados", icon: HandCoins },
  { to: "/admin/alunos", label: "Alunos", icon: GraduationCap },
  { to: "/admin/contatos", label: "Contatos", icon: MessagesSquare },
  { to: "/admin/suporte", label: "Suporte", icon: LifeBuoy },
  { to: "/admin/privacidade", label: "Privacidade", icon: ShieldCheck },
  { to: "/admin/erros", label: "Erros", icon: Bug },
] as const;

export const AdminNavigation = () => (
  <header className="sticky top-0 z-50 border-b border-white/10 bg-black/95 px-4 py-3 text-white backdrop-blur sm:px-6 lg:px-8">
    <div className="mx-auto flex max-w-[1600px] items-center gap-4">
      <NavLink
        to="/portal"
        className="flex shrink-0 items-center gap-2 rounded-lg px-2 py-2 font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
        aria-label="Voltar ao portal"
      >
        <UsersRound className="h-5 w-5 text-purple-300" aria-hidden="true" />
        <span className="hidden sm:inline">Administração</span>
      </NavLink>

      <nav
        aria-label="Navegação administrativa"
        className="flex min-w-0 flex-1 gap-2 overflow-x-auto py-1"
      >
        {adminNavigation.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/admin"}
            className={({ isActive }) =>
              cn(
                "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400",
                isActive
                  ? "border-purple-400/60 bg-purple-500/20 text-white"
                  : "border-white/10 bg-white/5 text-gray-300 hover:border-white/25 hover:bg-white/10 hover:text-white",
              )
            }
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  </header>
);

import {
  Award,
  Bell,
  BookOpen,
  CreditCard,
  GraduationCap,
  Heart,
  History,
  LayoutDashboard,
  Library,
  LifeBuoy,
  Loader2,
  LogOut,
  PackageCheck,
  ReceiptText,
  Settings2,
  ShieldCheck,
  ShoppingCart,
  UserRound,
} from "lucide-react";
import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { brandConfig } from "@/config/brand";
import { cn } from "@/lib/utils";

const studentNavigation = [
  { to: "/aluno", label: "Início", icon: LayoutDashboard, end: true },
  { to: "/aluno/cursos", label: "Meus cursos", icon: BookOpen, end: false },
  { to: "/cursos", label: "Comprar cursos", icon: ShoppingCart, end: true },
  { to: "/aluno/certificados", label: "Certificados", icon: Award, end: false },
  { to: "/aluno/biblioteca", label: "Biblioteca", icon: Library, end: false },
  { to: "/aluno/produtos", label: "Meus produtos", icon: PackageCheck, end: false },
  { to: "/aluno/favoritos", label: "Favoritos", icon: Heart, end: false },
  { to: "/aluno/pedidos", label: "Pedidos", icon: ReceiptText, end: false },
  { to: "/aluno/pagamentos", label: "Pagamentos", icon: CreditCard, end: false },
  { to: "/aluno/notificacoes", label: "Notificações", icon: Bell, end: false },
  { to: "/aluno/suporte", label: "Suporte", icon: LifeBuoy, end: false },
  { to: "/aluno/historico", label: "Histórico", icon: History, end: false },
  { to: "/aluno/perfil", label: "Perfil", icon: UserRound, end: false },
  { to: "/aluno/preferencias", label: "Preferências", icon: Settings2, end: false },
  { to: "/aluno/privacidade", label: "Privacidade", icon: ShieldCheck, end: false },
] as const;

interface StudentPortalShellProps {
  readonly displayName: string;
  readonly email: string;
  readonly isSigningOut: boolean;
  readonly onSignOut: () => void;
  readonly children: ReactNode;
}

const StudentNavigation = ({ mobile = false }: { readonly mobile?: boolean }) => (
  <nav
    className={cn(
      mobile
        ? "flex gap-2 overflow-x-auto pb-1"
        : "mt-10 flex flex-col gap-2",
    )}
    aria-label={
      mobile
        ? "Navegação móvel do Portal do Aluno"
        : "Navegação do Portal do Aluno"
    }
  >
    {studentNavigation.map(({ to, label, icon: Icon, end }) => (
      <NavLink
        key={to}
        to={to}
        end={end}
        className={({ isActive }) =>
          cn(
            "inline-flex items-center gap-3 font-medium transition-[color,background-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            mobile
              ? "shrink-0 rounded-full px-3 py-2 text-xs"
              : "min-h-11 rounded-xl px-4 py-3 text-sm",
            isActive
              ? "bg-course text-primary-foreground shadow-sm"
              : mobile
                ? "border border-border bg-card text-muted-foreground hover:border-course/40 hover:text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )
        }
      >
        <Icon className={mobile ? "h-3.5 w-3.5" : "h-4 w-4"} aria-hidden="true" />
        {label}
      </NavLink>
    ))}
  </nav>
);

export const StudentPortalShell = ({
  displayName,
  email,
  isSigningOut,
  onSignOut,
  children,
}: StudentPortalShellProps) => (
  <div className="app-shell" data-context="course">
    <div className="mx-auto flex min-h-screen max-w-[1600px]">
      <aside className="hidden w-72 shrink-0 border-r border-border bg-sidebar p-6 lg:flex lg:flex-col">
        <Link
          to="/aluno"
          aria-label={`Ir para o início de ${brandConfig.name}`}
          className="flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-sidebar"
        >
          <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-course/30 bg-course/10">
            <img
              src={brandConfig.logoPath}
              alt=""
              className="h-full w-full object-cover"
              aria-hidden="true"
            />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-bold text-sidebar-foreground">
              {brandConfig.name}
            </span>
            <span className="block text-xs text-muted-foreground">Portal do Aluno</span>
          </span>
        </Link>

        <StudentNavigation />

        <div className="surface-muted mt-auto p-4">
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-course/15 p-2 text-course">
              <GraduationCap className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
              <p className="truncate text-xs text-muted-foreground">{email}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            className="mt-3 w-full justify-start"
            disabled={isSigningOut}
            onClick={onSignOut}
          >
            {isSigningOut ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <LogOut aria-hidden="true" />
            )}
            Sair
          </Button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="app-header sticky top-0 z-20 px-4 py-4 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">Olá,</p>
              <p className="truncate font-semibold text-foreground">{displayName}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="lg:hidden"
              disabled={isSigningOut}
              onClick={onSignOut}
            >
              {isSigningOut ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <LogOut aria-hidden="true" />
              )}
              Sair
            </Button>
          </div>
          <div className="mt-4 lg:hidden">
            <StudentNavigation mobile />
          </div>
        </header>

        <main className="px-4 py-8 sm:px-6 lg:px-8 lg:py-10">{children}</main>
      </div>
    </div>
  </div>
);

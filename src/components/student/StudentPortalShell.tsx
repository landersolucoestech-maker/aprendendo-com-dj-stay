import {
  Award,
  Bell,
  BookOpen,
  Boxes,
  CreditCard,
  Heart,
  History,
  LayoutDashboard,
  Library,
  LifeBuoy,
  PackageCheck,
  ReceiptText,
  Settings2,
  ShieldCheck,
  ShoppingCart,
  UserRound,
} from "lucide-react";
import type { ReactNode } from "react";
import { Link, NavLink } from "react-router";

import { StudentShell } from "@/app/shells/StudentShell";
import { brandConfig } from "@/config/brand";
import { cn } from "@/lib/utils";
import { useAuthenticatedShellNavigation } from "@/shared/navigation/AuthenticatedShell";

const studentNavigation = [
  { to: "/aluno", label: "Início", icon: LayoutDashboard, end: true },
  { to: "/aluno/cursos", label: "Meus cursos", icon: BookOpen, end: false },
  { to: "/cursos", label: "Comprar cursos", icon: ShoppingCart, end: false },
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

const studentNavigationByPath = new Map(studentNavigation.map((item) => [item.to, item] as const));
const courseStorefrontNavigation = studentNavigationByPath.get("/cursos")!;
const commerceNavigation = [
  { ...courseStorefrontNavigation, displayLabel: "Cursos" },
  { to: "/marketplace", label: "Produtos digitais", displayLabel: "Produtos digitais", icon: Boxes, end: false },
] as const;

const studentGroups = [
  { label: "APRENDIZADO", paths: ["/aluno", "/aluno/cursos", "/aluno/biblioteca", "/aluno/favoritos", "/aluno/certificados", "/aluno/historico"] },
  { label: "MINHAS COMPRAS", paths: ["/aluno/produtos", "/aluno/pedidos", "/aluno/pagamentos"] },
  { label: "CONTA", paths: ["/aluno/notificacoes", "/aluno/suporte", "/aluno/perfil", "/aluno/preferencias", "/aluno/privacidade"] },
] as const;

const StudentBrand = () => (
  <Link
    to="/aluno"
    className="flex min-h-12 items-center gap-3 rounded-xl px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar"
    aria-label={`Ir para o início de ${brandConfig.name}`}
  >
    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-course/25 bg-course/10">
      <img src={brandConfig.logoPath} alt={brandConfig.logoAlt} className="h-full w-full object-cover" />
    </span>
    <span className="min-w-0">
      <span className="block truncate text-sm font-bold text-sidebar-foreground">{brandConfig.name}</span>
      <span className="block truncate text-xs text-muted-foreground">Portal do Aluno</span>
    </span>
  </Link>
);

const StudentNavigation = ({ mobile = false }: { readonly mobile?: boolean }) => {
  const { collapsed, closeNavigation } = useAuthenticatedShellNavigation();
  const compact = collapsed && !mobile;
  const renderItem = (item: (typeof studentNavigation)[number]) => {
    const Icon = item.icon;
    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end}
        aria-label={compact ? item.label : undefined}
        onClick={closeNavigation}
        className={({ isActive }) => cn(
          "flex min-h-11 items-center rounded-xl text-sm font-medium transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
          compact ? "justify-center px-2" : "gap-3 px-3",
          isActive ? "bg-course text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        {!compact ? <span>{item.label}</span> : null}
      </NavLink>
    );
  };

  return (
    <nav className="flex flex-col gap-5 overflow-y-auto pb-2" aria-label={mobile ? "Navegação móvel do Portal do Aluno" : "Navegação do Portal do Aluno"}>
      <div>
        {!compact ? <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">APRENDIZADO</p> : null}
        <div className="space-y-1">{studentGroups[0].paths.map((path) => renderItem(studentNavigationByPath.get(path)!))}</div>
      </div>
      <div>
        {!compact ? <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">COMPRAR</p> : null}
        <div className="space-y-1">
          {commerceNavigation.map(({ to, displayLabel, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} aria-label={compact ? displayLabel : undefined} onClick={closeNavigation} className={({ isActive }) => cn(
              "flex min-h-11 items-center rounded-xl text-sm font-medium transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
              compact ? "justify-center px-2" : "gap-3 px-3",
              isActive ? "bg-marketplace/15 text-marketplace" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}>
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {!compact ? <span>{displayLabel}</span> : null}
            </NavLink>
          ))}
        </div>
      </div>
      {studentGroups.slice(1).map((group) => (
        <div key={group.label}>
          {!compact ? <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{group.label}</p> : null}
          <div className="space-y-1">{group.paths.map((path) => renderItem(studentNavigationByPath.get(path)!))}</div>
        </div>
      ))}
    </nav>
  );
};

interface StudentPortalShellProps {
  readonly displayName: string;
  readonly email: string;
  readonly isSigningOut: boolean;
  readonly onSignOut: () => void;
  readonly children: ReactNode;
}

export const StudentPortalShell = ({ displayName, email, isSigningOut, onSignOut, children }: StudentPortalShellProps) => (
  <div data-context="course" className="app-shell">
    <StudentShell
    displayName={displayName}
    email={email}
    isSigningOut={isSigningOut}
    onSignOut={onSignOut}
    navigation={<StudentNavigation />}
    mobileNavigation={<StudentNavigation mobile />}
    brand={<StudentBrand />}
  >
      {children}
    </StudentShell>
  </div>
);

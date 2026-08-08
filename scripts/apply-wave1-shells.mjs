import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const writeText = async (path, content) => {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
};

const replaceExactly = async (path, before, after) => {
  const source = await readFile(path, "utf8");
  const count = source.split(before).length - 1;
  if (count !== 1) {
    throw new Error(`${path}: expected exactly one replacement target, found ${count}`);
  }
  await writeFile(path, source.replace(before, after), "utf8");
};

await writeText(
  "src/shared/navigation/AuthenticatedShell.tsx",
  String.raw`import {
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  LogOut,
  Menu,
} from "lucide-react";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Link } from "react-router";

import { Button } from "@/components/ui/button";
import { brandConfig } from "@/config/brand";
import { cn } from "@/lib/utils";

export type AuthenticatedShellContext = "course" | "admin" | "affiliate";

interface ShellNavigationContextValue {
  readonly collapsed: boolean;
  readonly closeNavigation: () => void;
}

const ShellNavigationContext = createContext<ShellNavigationContextValue>({
  collapsed: false,
  closeNavigation: () => undefined,
});

export const useAuthenticatedShellNavigation = () =>
  useContext(ShellNavigationContext);

interface AuthenticatedShellProps {
  readonly context: AuthenticatedShellContext;
  readonly portalLabel: string;
  readonly homePath: string;
  readonly headerTitle: string;
  readonly headerDescription?: string;
  readonly displayName: string;
  readonly email: string;
  readonly isSigningOut: boolean;
  readonly onSignOut: () => void;
  readonly navigation: ReactNode;
  readonly mobileNavigation?: ReactNode;
  readonly children: ReactNode;
}

const collapseStorageKey = "frontend-v2-auth-shell-collapsed";

const AccountBlock = ({
  collapsed,
  displayName,
  email,
  isSigningOut,
  onSignOut,
}: {
  readonly collapsed: boolean;
  readonly displayName: string;
  readonly email: string;
  readonly isSigningOut: boolean;
  readonly onSignOut: () => void;
}) => (
  <div className="rounded-xl border border-sidebar-border bg-surface-subtle/70 p-3">
    <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-3")}>
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-context/25 bg-context/10 text-sm font-bold text-context"
        aria-hidden="true"
      >
        {(displayName.trim().charAt(0) || "U").toUpperCase()}
      </span>
      {!collapsed ? (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-sidebar-foreground">
            {displayName}
          </p>
          <p className="truncate text-xs text-muted-foreground">{email}</p>
        </div>
      ) : null}
    </div>
    <Button
      data-shell-logout
      type="button"
      variant="ghost"
      size={collapsed ? "icon" : "sm"}
      className={cn("mt-3", collapsed ? "w-full" : "w-full justify-start")}
      disabled={isSigningOut}
      onClick={onSignOut}
      aria-label={collapsed ? "Sair da conta" : undefined}
    >
      {isSigningOut ? (
        <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
      ) : (
        <LogOut aria-hidden="true" />
      )}
      {!collapsed ? "Sair" : null}
    </Button>
  </div>
);

const BrandBlock = ({
  collapsed,
  homePath,
  portalLabel,
}: {
  readonly collapsed: boolean;
  readonly homePath: string;
  readonly portalLabel: string;
}) => (
  <Link
    to={homePath}
    className={cn(
      "flex min-h-12 items-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
      collapsed ? "justify-center" : "gap-3 px-1",
    )}
    aria-label={"Ir para o início de " + portalLabel}
  >
    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-context/25 bg-context/10">
      <img
        src={brandConfig.logoPath}
        alt=""
        className="h-full w-full object-cover"
        aria-hidden="true"
      />
    </span>
    {!collapsed ? (
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold text-sidebar-foreground">
          {brandConfig.name}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {portalLabel}
        </span>
      </span>
    ) : null}
  </Link>
);

export const AuthenticatedShell = ({
  context,
  portalLabel,
  homePath,
  headerTitle,
  headerDescription,
  displayName,
  email,
  isSigningOut,
  onSignOut,
  navigation,
  mobileNavigation,
  children,
}: AuthenticatedShellProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(collapseStorageKey) === "1");
    } catch {
      setCollapsed(false);
    }
  }, []);

  useEffect(() => {
    if (!drawerOpen) return;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setDrawerOpen(false);
      }
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    const focusFrame = window.requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>(
          "[data-shell-drawer-content] a, [data-shell-drawer-content] button:not([disabled])",
        )
        ?.focus();
    });
    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      window.requestAnimationFrame(() => {
        document.querySelector<HTMLButtonElement>("[data-shell-menu-button]")?.focus();
      });
    };
  }, [drawerOpen]);

  const setCollapsedPersisted = (next: boolean) => {
    setCollapsed(next);
    try {
      window.localStorage.setItem(collapseStorageKey, next ? "1" : "0");
    } catch {
      // Collapse remains available even when storage is unavailable.
    }
  };

  const desktopNavigationValue = useMemo<ShellNavigationContextValue>(
    () => ({ collapsed, closeNavigation: () => undefined }),
    [collapsed],
  );
  const mobileNavigationValue = useMemo<ShellNavigationContextValue>(
    () => ({ collapsed: false, closeNavigation: () => setDrawerOpen(false) }),
    [],
  );

  return (
    <div
      data-shell-root
      data-context={context}
      className="app-shell min-h-screen bg-background text-foreground"
    >
      <div className="mx-auto flex min-h-screen max-w-[1800px]">
        <aside
          data-shell-sidebar
          data-collapsed={collapsed ? "true" : "false"}
          className={cn(
            "sticky top-0 hidden h-screen shrink-0 border-r border-sidebar-border bg-sidebar transition-[width] duration-200 motion-reduce:transition-none lg:flex lg:flex-col",
            collapsed ? "w-20" : "w-64",
          )}
        >
          <div className="flex min-h-0 flex-1 flex-col p-4">
            <BrandBlock
              collapsed={collapsed}
              homePath={homePath}
              portalLabel={portalLabel}
            />
            <ShellNavigationContext.Provider value={desktopNavigationValue}>
              <div className="mt-6 min-h-0 flex-1 overflow-y-auto pr-1">
                {navigation}
              </div>
            </ShellNavigationContext.Provider>
            <div className="mt-4 space-y-2">
              <AccountBlock
                collapsed={collapsed}
                displayName={displayName}
                email={email}
                isSigningOut={isSigningOut}
                onSignOut={onSignOut}
              />
              <Button
                data-shell-collapse
                type="button"
                variant="outline"
                size={collapsed ? "icon" : "sm"}
                className={cn(collapsed ? "w-full" : "w-full justify-start")}
                aria-pressed={collapsed}
                aria-label={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
                onClick={() => setCollapsedPersisted(!collapsed)}
              >
                {collapsed ? (
                  <ChevronsRight aria-hidden="true" />
                ) : (
                  <ChevronsLeft aria-hidden="true" />
                )}
                {!collapsed ? "Recolher menu" : null}
              </Button>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="app-header sticky top-0 z-30 border-b border-border/80 bg-background/90 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
            <div className="flex min-h-12 items-center gap-3">
              <Button
                data-shell-menu-button
                type="button"
                variant="outline"
                size="icon"
                className="lg:hidden"
                aria-label="Abrir navegação"
                aria-expanded={drawerOpen}
                onClick={() => setDrawerOpen(true)}
              >
                <Menu aria-hidden="true" />
              </Button>
              <div className="min-w-0">
                <nav aria-label="Breadcrumb contextual">
                  <ol className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                    <li className="truncate">{portalLabel}</li>
                    <li aria-hidden="true">/</li>
                    <li className="truncate text-foreground" aria-current="page">
                      {headerTitle}
                    </li>
                  </ol>
                </nav>
                {headerDescription ? (
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {headerDescription}
                  </p>
                ) : null}
              </div>
            </div>
          </header>

          <main className="min-w-0">{children}</main>
        </div>
      </div>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Fechar navegação"
            className="absolute inset-0 cursor-default bg-background/80 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <aside
            data-shell-drawer-content
            data-state="open"
            role="dialog"
            aria-modal="true"
            aria-label={portalLabel}
            className="absolute inset-y-0 left-0 h-dvh w-full max-w-none border-r border-sidebar-border bg-sidebar p-0 shadow-raised sm:w-80 sm:max-w-sm"
          >
            <div className="flex h-full flex-col p-4">
              <BrandBlock
                collapsed={false}
                homePath={homePath}
                portalLabel={portalLabel}
              />
              <ShellNavigationContext.Provider value={mobileNavigationValue}>
                <div
                  className="mt-6 min-h-0 flex-1 overflow-y-auto pr-1"
                  onClickCapture={(event) => {
                    const target = event.target as HTMLElement;
                    if (target.closest("a")) setDrawerOpen(false);
                  }}
                >
                  {mobileNavigation ?? navigation}
                </div>
              </ShellNavigationContext.Provider>
              <div className="mt-4">
                <AccountBlock
                  collapsed={false}
                  displayName={displayName}
                  email={email}
                  isSigningOut={isSigningOut}
                  onSignOut={onSignOut}
                />
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
};
`,
);

await writeText(
  "src/app/shells/StudentShell.tsx",
  String.raw`import type { ReactNode } from "react";
import { useLocation } from "react-router";

import { AuthenticatedShell } from "@/shared/navigation/AuthenticatedShell";

interface StudentShellProps {
  readonly displayName: string;
  readonly email: string;
  readonly isSigningOut: boolean;
  readonly onSignOut: () => void;
  readonly navigation: ReactNode;
  readonly mobileNavigation: ReactNode;
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
    >
      {children}
    </AuthenticatedShell>
  );
};
`,
);

await writeText(
  "src/app/shells/AdminShell.tsx",
  String.raw`import { useMemo, useState, type ReactNode } from "react";
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
`,
);

await writeText(
  "src/app/shells/AffiliateShell.tsx",
  String.raw`import {
  Activity,
  BadgeDollarSign,
  ChartNoAxesCombined,
  LayoutDashboard,
  Link2,
  MousePointerClick,
  Tags,
  WalletCards,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router";

import { getUserMetadataProfile } from "@/auth/user-metadata";
import { useAuth } from "@/auth/use-auth";
import { cn } from "@/lib/utils";
import {
  AuthenticatedShell,
  useAuthenticatedShellNavigation,
} from "@/shared/navigation/AuthenticatedShell";

const affiliateGroups = [
  { label: "GERAL", items: [{ hash: "#affiliate-overview", label: "Visão geral", icon: LayoutDashboard }] },
  { label: "OPERAÇÃO", items: [{ hash: "#affiliate-offers", label: "Ofertas", icon: Tags }, { hash: "#affiliate-links", label: "Links", icon: Link2 }] },
  { label: "PERFORMANCE", items: [{ hash: "#affiliate-clicks", label: "Cliques", icon: MousePointerClick }, { hash: "#affiliate-conversions", label: "Conversões", icon: ChartNoAxesCombined }] },
  { label: "FINANCEIRO", items: [{ hash: "#affiliate-commissions", label: "Comissões", icon: BadgeDollarSign }, { hash: "#affiliate-payouts", label: "Payouts", icon: WalletCards }] },
  { label: "HISTÓRICO", items: [{ hash: "#affiliate-events", label: "Eventos", icon: Activity }] },
] as const;

const AffiliateNavigation = () => {
  const location = useLocation();
  const { collapsed, closeNavigation } = useAuthenticatedShellNavigation();
  const activeHash = location.hash || "#affiliate-overview";

  return (
    <nav aria-label="Navegação do Portal do Afiliado" className="space-y-5">
      {affiliateGroups.map((group) => (
        <div key={group.label}>
          {!collapsed ? <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{group.label}</p> : null}
          <div className="space-y-1">
            {group.items.map(({ hash, label, icon: Icon }) => {
              const active = activeHash === hash;
              return (
                <Link
                  key={hash}
                  to={{ pathname: "/afiliado", hash }}
                  aria-current={active ? "page" : undefined}
                  aria-label={collapsed ? label : undefined}
                  className={cn(
                    "flex min-h-11 items-center rounded-xl text-sm font-medium transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
                    collapsed ? "justify-center px-2" : "gap-3 px-3",
                    active ? "bg-affiliate/15 text-affiliate" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                  onClick={() => {
                    closeNavigation();
                    window.requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView({ block: "start" }));
                  }}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {!collapsed ? <span>{label}</span> : null}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
};

const getAffiliateHeaderTitle = (hash: string): string => {
  const normalized = hash || "#affiliate-overview";
  for (const group of affiliateGroups) {
    const item = group.items.find((candidate) => candidate.hash === normalized);
    if (item) return item.label;
  }
  return "Visão geral";
};

export const AffiliateShell = ({ children }: { readonly children: ReactNode }) => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const displayName = useMemo(() => {
    if (!user) return "Afiliado";
    try {
      return getUserMetadataProfile(user).fullName;
    } catch {
      return user.email ?? "Afiliado";
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
      context="affiliate"
      portalLabel="Portal do Afiliado"
      homePath="/afiliado"
      headerTitle={getAffiliateHeaderTitle(location.hash)}
      headerDescription="Operação, performance e histórico sem criar novas rotas."
      displayName={displayName}
      email={user?.email ?? ""}
      isSigningOut={isSigningOut}
      onSignOut={() => void handleSignOut()}
      navigation={<AffiliateNavigation />}
    >
      {children}
    </AuthenticatedShell>
  );
};
`,
);

await writeText(
  "src/components/admin/AdminNavigation.tsx",
  String.raw`import {
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
  { to: "/admin", label: "Visão geral", icon: LayoutDashboard, group: "VISÃO GERAL" },
  { to: "/admin/cursos", label: "Cursos", icon: BookOpen, group: "CONTEÚDO" },
  { to: "/admin/produtos", label: "Produtos", icon: Boxes, group: "CONTEÚDO" },
  { to: "/admin/alunos", label: "Alunos", icon: GraduationCap, group: "ACADÊMICO" },
  { to: "/admin/academico", label: "Acadêmico", icon: BarChart3, group: "ACADÊMICO" },
  { to: "/admin/pagamentos", label: "Pagamentos", icon: Banknote, group: "FINANCEIRO" },
  { to: "/admin/afiliados", label: "Afiliados", icon: HandCoins, group: "FINANCEIRO" },
  { to: "/admin/contatos", label: "Contatos", icon: MessagesSquare, group: "RELACIONAMENTO" },
  { to: "/admin/suporte", label: "Suporte", icon: LifeBuoy, group: "RELACIONAMENTO" },
  { to: "/admin/privacidade", label: "Privacidade", icon: ShieldCheck, group: "GOVERNANÇA" },
  { to: "/admin/erros", label: "Erros", icon: Bug, group: "GOVERNANÇA" },
] as const;

const visibleAdminNavigation = adminNavigation.filter((item) => item.to !== "/admin/erros");
const adminGroups = ["VISÃO GERAL", "CONTEÚDO", "ACADÊMICO", "FINANCEIRO", "RELACIONAMENTO", "GOVERNANÇA"] as const;

export const AdminNavigation = () => {
  const { collapsed, closeNavigation } = useAuthenticatedShellNavigation();
  return (
    <nav aria-label="Navegação administrativa" className="flex h-full flex-col gap-5 overflow-x-auto overflow-y-auto pb-2">
      {adminGroups.map((group) => {
        const items = visibleAdminNavigation.filter((item) => item.group === group);
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
`,
);

await writeText(
  "src/components/student/StudentPortalShell.tsx",
  String.raw`import {
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
import { NavLink } from "react-router";

import { StudentShell } from "@/app/shells/StudentShell";
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
          isActive ? "bg-course/15 text-course" : "text-muted-foreground hover:bg-muted hover:text-foreground",
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
  <StudentShell
    displayName={displayName}
    email={email}
    isSigningOut={isSigningOut}
    onSignOut={onSignOut}
    navigation={<StudentNavigation />}
    mobileNavigation={<StudentNavigation mobile />}
  >
    {children}
  </StudentShell>
);
`,
);

await replaceExactly(
  "src/App.tsx",
  'import { AdminNavigation } from "@/components/admin/AdminNavigation";\n',
  'import { AdminShell } from "@/app/shells/AdminShell";\nimport { AffiliateShell } from "@/app/shells/AffiliateShell";\nimport { AdminNavigation } from "@/components/admin/AdminNavigation";\n',
);

await replaceExactly(
  "src/App.tsx",
  `const AffiliateRoute = ({ children }: { children: React.ReactNode }) => (\n  <RequireAuth>\n    <RequireRole allowedRoles={["afiliado"]}>{children}</RequireRole>\n  </RequireAuth>\n);`,
  `const AffiliateRoute = ({ children }: { children: React.ReactNode }) => (\n  <RequireAuth>\n    <RequireRole allowedRoles={["afiliado"]}>\n      <AffiliateShell>{children}</AffiliateShell>\n    </RequireRole>\n  </RequireAuth>\n);`,
);

await replaceExactly(
  "src/App.tsx",
  `const AdminRoute = ({ children }: { children: React.ReactNode }) => (\n  <RequireAuth>\n    <RequireRole allowedRoles={["administrador_proprietario"]}>\n      <div className="min-h-screen bg-black">\n        <AdminNavigation />\n        {children}\n      </div>\n    </RequireRole>\n  </RequireAuth>\n);`,
  `const AdminRoute = ({ children }: { children: React.ReactNode }) => (\n  <RequireAuth>\n    <RequireRole allowedRoles={["administrador_proprietario"]}>\n      <AdminShell navigation={<AdminNavigation />}>{children}</AdminShell>\n    </RequireRole>\n  </RequireAuth>\n);`,
);

await replaceExactly(
  "src/pages/affiliate/AffiliatePortal.tsx",
  '      <div className="space-y-8">\n        <section\n          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"',
  '      <div className="space-y-8">\n        <span id="affiliate-overview" className="sr-only" />\n        <section\n          id="affiliate-performance"\n          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"',
);
await replaceExactly(
  "src/pages/affiliate/AffiliatePortal.tsx",
  '          aria-label="Resumo do afiliado"\n        >\n          <SummaryCard',
  '          aria-label="Resumo do afiliado"\n        >\n          <span id="affiliate-clicks" className="sr-only" />\n          <span id="affiliate-conversions" className="sr-only" />\n          <SummaryCard',
);
await replaceExactly(
  "src/pages/affiliate/AffiliatePortal.tsx",
  '        <Card variant="affiliate">\n          <CardHeader>\n            <CardTitle className="flex items-center gap-2">\n              <Link2',
  '        <Card id="affiliate-offers" variant="affiliate">\n          <CardHeader>\n            <CardTitle className="flex items-center gap-2">\n              <Link2',
);
await replaceExactly(
  "src/pages/affiliate/AffiliatePortal.tsx",
  '        <Card variant="affiliate">\n          <CardHeader>\n            <CardTitle>Links rastreáveis</CardTitle>',
  '        <Card id="affiliate-links" variant="affiliate">\n          <CardHeader>\n            <CardTitle>Links rastreáveis</CardTitle>',
);
await replaceExactly(
  "src/pages/affiliate/AffiliatePortal.tsx",
  '          <Card variant="affiliate">\n            <CardHeader>\n              <CardTitle>Comissões</CardTitle>',
  '          <Card id="affiliate-commissions" variant="affiliate">\n            <CardHeader>\n              <CardTitle>Comissões</CardTitle>',
);
await replaceExactly(
  "src/pages/affiliate/AffiliatePortal.tsx",
  '          <Card variant="affiliate">\n            <CardHeader>\n              <CardTitle>Repasses</CardTitle>',
  '          <Card id="affiliate-payouts" variant="affiliate">\n            <CardHeader>\n              <CardTitle>Repasses</CardTitle>',
);
await replaceExactly(
  "src/pages/affiliate/AffiliatePortal.tsx",
  '        <Card variant="affiliate">\n          <CardHeader>\n            <CardTitle className="flex items-center gap-2">\n              <Activity',
  '        <Card id="affiliate-events" variant="affiliate">\n          <CardHeader>\n            <CardTitle className="flex items-center gap-2">\n              <Activity',
);

console.log("WAVE1_SHELL_APPLY=PASS");

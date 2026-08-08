import {
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
  readonly brand?: ReactNode;
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
  brand,
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
            {brand ?? (
              <BrandBlock
                collapsed={collapsed}
                homePath={homePath}
                portalLabel={portalLabel}
              />
            )}
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
              {brand ?? (
                <BrandBlock
                  collapsed={false}
                  homePath={homePath}
                  portalLabel={portalLabel}
                />
              )}
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

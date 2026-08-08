import {
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

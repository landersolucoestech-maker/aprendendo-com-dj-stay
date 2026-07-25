import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { AppRole, db, Profile } from "@/lib/platform";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  roles: AppRole[];
  loading: boolean;
  hasRole: (...allowed: AppRole[]) => boolean;
  refreshIdentity: () => Promise<void>;
  signOut: () => Promise<void>;
  defaultRoute: string;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const loadIdentity = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession);
    if (!nextSession?.user) {
      setProfile(null);
      setRoles([]);
      setLoading(false);
      return;
    }

    const userId = nextSession.user.id;
    const [profileResult, rolesResult] = await Promise.all([
      db.from("profiles").select("id,full_name,phone,avatar_url,status").eq("id", userId).maybeSingle(),
      db.from("user_roles").select("role").eq("user_id", userId),
    ]);

    if (profileResult.error) console.error("Could not load profile", profileResult.error);
    if (rolesResult.error) console.error("Could not load roles", rolesResult.error);

    setProfile((profileResult.data as Profile | null) ?? {
      id: userId,
      full_name: nextSession.user.user_metadata?.full_name ?? nextSession.user.email ?? "Usuário",
      phone: null,
      avatar_url: null,
      status: "active",
    });
    setRoles(((rolesResult.data ?? []) as Array<{ role: AppRole }>).map((entry) => entry.role));
    setLoading(false);
  }, []);

  const refreshIdentity = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error("Could not refresh session", error);
      await loadIdentity(null);
      return;
    }
    await loadIdentity(data.session);
  }, [loadIdentity]);

  useEffect(() => {
    void refreshIdentity();
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void loadIdentity(nextSession);
    });
    return () => data.subscription.unsubscribe();
  }, [loadIdentity, refreshIdentity]);

  const hasRole = useCallback((...allowed: AppRole[]) => allowed.some((role) => roles.includes(role)), [roles]);

  const defaultRoute = useMemo(() => {
    if (roles.includes("owner") || roles.includes("admin") || roles.includes("instructor")) return "/instrutor";
    if (roles.includes("support")) return "/instrutor/atendimento";
    return "/dashboard";
  }, [roles]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    await loadIdentity(null);
  }, [loadIdentity]);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user: session?.user ?? null,
    profile,
    roles,
    loading,
    hasRole,
    refreshIdentity,
    signOut,
    defaultRoute,
  }), [session, profile, roles, loading, hasRole, refreshIdentity, signOut, defaultRoute]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}

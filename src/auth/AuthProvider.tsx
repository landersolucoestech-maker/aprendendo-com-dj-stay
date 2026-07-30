import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PropsWithChildren } from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { queryClient } from "@/lib/query-client";
import { getAuthErrorMessage } from "./auth-errors";
import { AuthContext, type AuthStatus } from "./auth-context";

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const previousUserId = useRef<string | null>(null);

  const applySession = useCallback((nextSession: Session | null) => {
    const nextUserId = nextSession?.user.id ?? null;

    if (previousUserId.current !== nextUserId) {
      queryClient.clear();
      previousUserId.current = nextUserId;
    }

    setSession(nextSession);
    setErrorMessage(null);
    setStatus("ready");
  }, []);

  const refreshSession = useCallback(async () => {
    setStatus("loading");
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      setErrorMessage(getAuthErrorMessage(error));
      setStatus("error");
      return;
    }

    applySession(data.session);
  }, [applySession]);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }

    applySession(null);
  }, [applySession]);

  useEffect(() => {
    let isMounted = true;

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) {
        return;
      }

      if (error) {
        setErrorMessage(getAuthErrorMessage(error));
        setStatus("error");
        return;
      }

      applySession(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (isMounted) {
        applySession(nextSession);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [applySession]);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      status,
      errorMessage,
      signOut,
      refreshSession,
    }),
    [errorMessage, refreshSession, session, signOut, status],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

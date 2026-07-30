import { createContext } from "react";
import type { Session, User } from "@supabase/supabase-js";

export type AuthStatus = "loading" | "ready" | "error";

export interface AuthContextValue {
  readonly session: Session | null;
  readonly user: User | null;
  readonly status: AuthStatus;
  readonly errorMessage: string | null;
  signOut(): Promise<void>;
  refreshSession(): Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

import { supabase } from "@/integrations/supabase/client";
import { getSafeInternalPath } from "@/routing/route-state";

function absoluteAppUrl(path: string): string {
  return new URL(path, window.location.origin).toString();
}

function signupCallbackPath(returnPath: unknown): string {
  const verifiedPath = `/verificado?return=${encodeURIComponent(
    getSafeInternalPath(returnPath),
  )}`;

  return `/auth/callback?next=${encodeURIComponent(verifiedPath)}`;
}

export async function signInWithPassword(email: string, password: string) {
  return supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
}

export async function signUpWithPassword(input: {
  readonly email: string;
  readonly password: string;
  readonly fullName: string;
  readonly phone: string;
  readonly returnPath?: string;
}) {
  return supabase.auth.signUp({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    options: {
      emailRedirectTo: absoluteAppUrl(signupCallbackPath(input.returnPath)),
      data: {
        full_name: input.fullName.trim(),
        phone: input.phone.trim(),
      },
    },
  });
}

export async function requestPasswordReset(email: string) {
  return supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: absoluteAppUrl("/auth/callback?next=/redefinir-senha"),
  });
}

export async function resendSignupConfirmation(
  email: string,
  returnPath: unknown = "/portal",
) {
  return supabase.auth.resend({
    type: "signup",
    email: email.trim().toLowerCase(),
    options: {
      emailRedirectTo: absoluteAppUrl(signupCallbackPath(returnPath)),
    },
  });
}

export async function updatePassword(password: string) {
  return supabase.auth.updateUser({ password });
}

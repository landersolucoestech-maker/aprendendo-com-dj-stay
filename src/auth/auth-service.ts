import { supabase } from "@/integrations/supabase/client";

function absoluteAppUrl(path: string): string {
  return new URL(path, window.location.origin).toString();
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
}) {
  return supabase.auth.signUp({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    options: {
      emailRedirectTo: absoluteAppUrl("/auth/callback?next=/verificado"),
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

export async function resendSignupConfirmation(email: string) {
  return supabase.auth.resend({
    type: "signup",
    email: email.trim().toLowerCase(),
    options: {
      emailRedirectTo: absoluteAppUrl("/auth/callback?next=/verificado"),
    },
  });
}

export async function updatePassword(password: string) {
  return supabase.auth.updateUser({ password });
}

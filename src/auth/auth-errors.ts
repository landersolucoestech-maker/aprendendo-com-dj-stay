import { AuthError } from "@supabase/supabase-js";

const MESSAGE_MAP: Readonly<Record<string, string>> = {
  "Invalid login credentials": "Email ou senha incorretos.",
  "Email not confirmed": "Confirme seu email antes de entrar.",
  "User already registered": "Este email já está cadastrado.",
  "Password should be at least 6 characters": "A senha deve ter pelo menos 8 caracteres.",
  "New password should be different from the old password.":
    "A nova senha deve ser diferente da senha atual.",
};

export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof AuthError) {
    return MESSAGE_MAP[error.message] ?? error.message;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Não foi possível concluir a operação. Tente novamente.";
}

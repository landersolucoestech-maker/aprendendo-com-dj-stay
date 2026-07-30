import type { Location } from "react-router-dom";

export interface LoginLocationState {
  readonly from?: Pick<Location, "pathname" | "search" | "hash">;
}

export function getSafeReturnPath(state: unknown): string {
  if (!state || typeof state !== "object" || !("from" in state)) {
    return "/dashboard";
  }

  const from = (state as LoginLocationState).from;

  if (!from?.pathname?.startsWith("/") || from.pathname.startsWith("//")) {
    return "/dashboard";
  }

  return `${from.pathname}${from.search ?? ""}${from.hash ?? ""}`;
}

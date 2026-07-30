export function getSafeReturnPath(state: unknown): string {
  if (!state || typeof state !== "object" || !("from" in state)) {
    return "/dashboard";
  }

  const from = Reflect.get(state, "from");
  if (!from || typeof from !== "object") {
    return "/dashboard";
  }

  const pathname = Reflect.get(from, "pathname");
  const search = Reflect.get(from, "search");
  const hash = Reflect.get(from, "hash");

  if (typeof pathname !== "string" || !pathname.startsWith("/") || pathname.startsWith("//")) {
    return "/dashboard";
  }

  return `${pathname}${typeof search === "string" ? search : ""}${typeof hash === "string" ? hash : ""}`;
}

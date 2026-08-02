export interface SafeReturnLocation {
  readonly pathname: string;
  readonly search: string;
  readonly hash: string;
}

export function getSafeInternalPath(
  value: unknown,
  fallback = "/portal",
): string {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    value.includes("\u0000")
  ) {
    return fallback;
  }

  return value;
}

export function getSafeReturnPath(state: unknown): string {
  if (!state || typeof state !== "object" || !("from" in state)) {
    return "/portal";
  }

  const from = Reflect.get(state, "from");
  if (!from || typeof from !== "object") {
    return "/portal";
  }

  const pathname = Reflect.get(from, "pathname");
  const search = Reflect.get(from, "search");
  const hash = Reflect.get(from, "hash");

  if (typeof pathname !== "string") return "/portal";

  return getSafeInternalPath(
    `${pathname}${typeof search === "string" ? search : ""}${typeof hash === "string" ? hash : ""}`,
  );
}

export function toSafeReturnLocation(path: unknown): SafeReturnLocation {
  const safePath = getSafeInternalPath(path);
  const parsed = new URL(safePath, "https://app.invalid");

  return {
    pathname: parsed.pathname,
    search: parsed.search,
    hash: parsed.hash,
  };
}

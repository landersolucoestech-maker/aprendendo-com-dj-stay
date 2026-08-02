import type { HostedCheckoutInput } from "@/contracts/checkout";

const IDEMPOTENCY_KEY_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const checkoutStorageKey = (
  subjectType: HostedCheckoutInput["subjectType"],
  subjectId: string,
  licenseId: string | null,
): string => `hosted-checkout:${subjectType}:${subjectId}:${licenseId ?? "none"}`;

const readStoredKey = (storageKey: string): string | null => {
  try {
    return window.sessionStorage.getItem(storageKey);
  } catch {
    return null;
  }
};

const persistKey = (storageKey: string, idempotencyKey: string): void => {
  try {
    window.sessionStorage.setItem(storageKey, idempotencyKey);
  } catch {
    // A indisponibilidade do storage não pode bloquear a criação do checkout.
  }
};

export const getHostedCheckoutIdempotencyKey = (
  subjectType: HostedCheckoutInput["subjectType"],
  subjectId: string,
  licenseId: string | null,
): string => {
  const storageKey = checkoutStorageKey(subjectType, subjectId, licenseId);
  const existing = readStoredKey(storageKey);

  if (existing && IDEMPOTENCY_KEY_PATTERN.test(existing)) return existing;

  const idempotencyKey = crypto.randomUUID();
  persistKey(storageKey, idempotencyKey);
  return idempotencyKey;
};

export const clearHostedCheckoutIdempotencyKey = (
  subjectType: HostedCheckoutInput["subjectType"],
  subjectId: string,
  licenseId: string | null,
): void => {
  try {
    window.sessionStorage.removeItem(
      checkoutStorageKey(subjectType, subjectId, licenseId),
    );
  } catch {
    // Limpeza best-effort: storage bloqueado não deve interromper a navegação.
  }
};

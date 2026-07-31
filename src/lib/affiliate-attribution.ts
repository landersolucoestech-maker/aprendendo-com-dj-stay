const AFFILIATE_VISITOR_TOKEN_KEY = "affiliate-visitor-token:v1";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const getStoredAffiliateVisitorToken = (): string | null => {
  try {
    const value = window.localStorage.getItem(AFFILIATE_VISITOR_TOKEN_KEY);
    return value && UUID_PATTERN.test(value) ? value : null;
  } catch {
    return null;
  }
};

export const ensureAffiliateVisitorToken = (): string => {
  const existing = getStoredAffiliateVisitorToken();
  if (existing) return existing;

  const value = crypto.randomUUID();
  try {
    window.localStorage.setItem(AFFILIATE_VISITOR_TOKEN_KEY, value);
  } catch {
    // The token still works for the current navigation even when storage is unavailable.
  }
  return value;
};

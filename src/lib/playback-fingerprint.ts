const SESSION_NONCE_KEY = "djstay.playback.session-nonce";

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

const readStoredSessionNonce = (): string | null => {
  try {
    return window.sessionStorage.getItem(SESSION_NONCE_KEY);
  } catch {
    return null;
  }
};

const persistSessionNonce = (nonce: string): void => {
  try {
    window.sessionStorage.setItem(SESSION_NONCE_KEY, nonce);
  } catch {
    // O fingerprint continua best-effort quando o storage da sessão está indisponível.
  }
};

const getSessionNonce = (): string => {
  const existing = readStoredSessionNonce();
  if (existing) {
    return existing;
  }

  const nonce = crypto.randomUUID();
  persistSessionNonce(nonce);
  return nonce;
};

export async function getPlaybackFingerprint(): Promise<string> {
  const source = [
    getSessionNonce(),
    navigator.userAgent,
    navigator.language,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    `${window.screen.width}x${window.screen.height}`,
  ].join("|");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(source));
  return toHex(new Uint8Array(digest));
}

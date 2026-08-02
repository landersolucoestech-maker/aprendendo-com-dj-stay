import { afterEach, describe, expect, it, vi } from "vitest";

import { getPlaybackFingerprint } from "./playback-fingerprint";

const SESSION_NONCE_KEY = "djstay.playback.session-nonce";
const EXISTING_NONCE = "123e4567-e89b-42d3-a456-426614174000";
const GENERATED_NONCE = "7aa48813-4885-4bc9-9e6f-8dfb32bdba73";
const EXISTING_FINGERPRINT =
  "6b1d6240cb0479adba3b421db99f77f7bf42290705f5dd7a3a3cbdba04c5477a";
const GENERATED_FINGERPRINT =
  "818c4fd0a174a7f830f1f90f90da2ab748ef4f403b12f25175c03cb5f7509da7";

interface EnvironmentOptions {
  readonly storedNonce?: string | null;
  readonly readError?: Error;
  readonly writeError?: Error;
}

const installEnvironment = (options: EnvironmentOptions = {}) => {
  const nativeSubtle = globalThis.crypto.subtle;
  const getItem = vi.fn(() => {
    if (options.readError) throw options.readError;
    return options.storedNonce ?? null;
  });
  const setItem = vi.fn(() => {
    if (options.writeError) throw options.writeError;
  });
  const randomUUID = vi.fn(() => GENERATED_NONCE);

  vi.stubGlobal("window", {
    sessionStorage: { getItem, setItem },
    screen: { width: 1920, height: 1080 },
  });
  vi.stubGlobal("navigator", {
    userAgent: "Test Agent",
    language: "pt-BR",
  });
  vi.stubGlobal("crypto", {
    randomUUID,
    subtle: nativeSubtle,
  });
  vi.spyOn(Intl, "DateTimeFormat").mockImplementation(
    () =>
      ({
        resolvedOptions: () => ({ timeZone: "America/Sao_Paulo" }),
      }) as Intl.DateTimeFormat,
  );

  return { getItem, setItem, randomUUID };
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("getPlaybackFingerprint", () => {
  it("reutiliza nonce existente e produz SHA-256 hexadecimal determinístico", async () => {
    const environment = installEnvironment({ storedNonce: EXISTING_NONCE });

    await expect(getPlaybackFingerprint()).resolves.toBe(EXISTING_FINGERPRINT);
    expect(environment.getItem).toHaveBeenCalledOnce();
    expect(environment.getItem).toHaveBeenCalledWith(SESSION_NONCE_KEY);
    expect(environment.randomUUID).not.toHaveBeenCalled();
    expect(environment.setItem).not.toHaveBeenCalled();
    expect(EXISTING_FINGERPRINT).toMatch(/^[0-9a-f]{64}$/);
  });

  it("gera, persiste e incorpora o nonce novo no fingerprint", async () => {
    const environment = installEnvironment();

    await expect(getPlaybackFingerprint()).resolves.toBe(GENERATED_FINGERPRINT);
    expect(environment.randomUUID).toHaveBeenCalledOnce();
    expect(environment.setItem).toHaveBeenCalledWith(
      SESSION_NONCE_KEY,
      GENERATED_NONCE,
    );
    expect(GENERATED_FINGERPRINT).toMatch(/^[0-9a-f]{64}$/);
  });

  it("continua quando a leitura do sessionStorage falha", async () => {
    const environment = installEnvironment({
      readError: new Error("sessionStorage bloqueado"),
    });

    await expect(getPlaybackFingerprint()).resolves.toBe(GENERATED_FINGERPRINT);
    expect(environment.randomUUID).toHaveBeenCalledOnce();
    expect(environment.setItem).toHaveBeenCalledWith(
      SESSION_NONCE_KEY,
      GENERATED_NONCE,
    );
  });

  it("continua quando a gravação do sessionStorage falha", async () => {
    const environment = installEnvironment({
      writeError: new Error("quota indisponível"),
    });

    await expect(getPlaybackFingerprint()).resolves.toBe(GENERATED_FINGERPRINT);
    expect(environment.setItem).toHaveBeenCalledWith(
      SESSION_NONCE_KEY,
      GENERATED_NONCE,
    );
  });
});

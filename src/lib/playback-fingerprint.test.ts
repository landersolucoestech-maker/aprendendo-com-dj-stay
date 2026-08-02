import { afterEach, describe, expect, it, vi } from "vitest";

import { getPlaybackFingerprint } from "./playback-fingerprint";

const SESSION_NONCE_KEY = "djstay.playback.session-nonce";
const EXISTING_NONCE = "123e4567-e89b-42d3-a456-426614174000";
const GENERATED_NONCE = "7aa48813-4885-4bc9-9e6f-8dfb32bdba73";
const EXPECTED_SOURCE = `${EXISTING_NONCE}|Test Agent|pt-BR|America/Sao_Paulo|1920x1080`;

interface EnvironmentOptions {
  readonly storedNonce?: string | null;
  readonly readError?: Error;
  readonly writeError?: Error;
}

const installEnvironment = (options: EnvironmentOptions = {}) => {
  const getItem = vi.fn(() => {
    if (options.readError) throw options.readError;
    return options.storedNonce ?? null;
  });
  const setItem = vi.fn(() => {
    if (options.writeError) throw options.writeError;
  });
  const randomUUID = vi.fn(() => GENERATED_NONCE);
  const digest = vi.fn(
    async (_algorithm: AlgorithmIdentifier, _data: BufferSource) =>
      Uint8Array.from([0, 15, 16, 255]).buffer,
  );

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
    subtle: { digest },
  });
  vi.spyOn(Intl, "DateTimeFormat").mockImplementation(
    (
      _locales?: Intl.LocalesArgument,
      _options?: Intl.DateTimeFormatOptions,
    ) =>
      ({
        resolvedOptions: () => ({ timeZone: "America/Sao_Paulo" }),
      }) as Intl.DateTimeFormat,
  );

  return { getItem, setItem, randomUUID, digest };
};

const getDigestSource = (
  digest: ReturnType<typeof vi.fn>,
): string => {
  const firstCall = digest.mock.calls[0];
  const input = firstCall?.[1];

  if (!(input instanceof Uint8Array)) {
    throw new Error("O digest deveria receber a fonte codificada como Uint8Array.");
  }

  return new TextDecoder().decode(input);
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("getPlaybackFingerprint", () => {
  it("reutiliza nonce existente e produz hexadecimal determinístico", async () => {
    const environment = installEnvironment({ storedNonce: EXISTING_NONCE });

    await expect(getPlaybackFingerprint()).resolves.toBe("000f10ff");
    expect(environment.getItem).toHaveBeenCalledOnce();
    expect(environment.getItem).toHaveBeenCalledWith(SESSION_NONCE_KEY);
    expect(environment.randomUUID).not.toHaveBeenCalled();
    expect(environment.setItem).not.toHaveBeenCalled();
    expect(environment.digest).toHaveBeenCalledOnce();
    expect(environment.digest.mock.calls[0]?.[0]).toBe("SHA-256");
    expect(getDigestSource(environment.digest)).toBe(EXPECTED_SOURCE);
  });

  it("gera e persiste nonce quando a sessão ainda não possui valor", async () => {
    const environment = installEnvironment();

    await expect(getPlaybackFingerprint()).resolves.toBe("000f10ff");
    expect(environment.randomUUID).toHaveBeenCalledOnce();
    expect(environment.setItem).toHaveBeenCalledWith(
      SESSION_NONCE_KEY,
      GENERATED_NONCE,
    );
    expect(getDigestSource(environment.digest)).toContain(GENERATED_NONCE);
  });

  it("continua quando a leitura do sessionStorage falha", async () => {
    const environment = installEnvironment({
      readError: new Error("sessionStorage bloqueado"),
    });

    await expect(getPlaybackFingerprint()).resolves.toBe("000f10ff");
    expect(environment.randomUUID).toHaveBeenCalledOnce();
    expect(environment.setItem).toHaveBeenCalledWith(
      SESSION_NONCE_KEY,
      GENERATED_NONCE,
    );
    expect(getDigestSource(environment.digest)).toContain(GENERATED_NONCE);
  });

  it("continua quando a gravação do sessionStorage falha", async () => {
    const environment = installEnvironment({
      writeError: new Error("quota indisponível"),
    });

    await expect(getPlaybackFingerprint()).resolves.toBe("000f10ff");
    expect(environment.setItem).toHaveBeenCalledWith(
      SESSION_NONCE_KEY,
      GENERATED_NONCE,
    );
    expect(getDigestSource(environment.digest)).toContain(GENERATED_NONCE);
  });
});

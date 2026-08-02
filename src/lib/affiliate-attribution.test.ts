import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ensureAffiliateVisitorToken,
  getStoredAffiliateVisitorToken,
} from "./affiliate-attribution";

const TOKEN_KEY = "affiliate-visitor-token:v1";
const VALID_TOKEN = "123e4567-e89b-42d3-a456-426614174000";
const GENERATED_TOKEN = "7aa48813-4885-4bc9-9e6f-8dfb32bdba73";

interface StorageDouble {
  readonly getItem: ReturnType<typeof vi.fn>;
  readonly setItem: ReturnType<typeof vi.fn>;
}

const installStorage = (
  storedValue: string | null,
  options: { readonly readError?: Error; readonly writeError?: Error } = {},
): StorageDouble => {
  const getItem = vi.fn(() => {
    if (options.readError) throw options.readError;
    return storedValue;
  });
  const setItem = vi.fn(() => {
    if (options.writeError) throw options.writeError;
  });

  vi.stubGlobal("window", {
    localStorage: { getItem, setItem },
  });

  return { getItem, setItem };
};

const installCrypto = (token = GENERATED_TOKEN) => {
  const randomUUID = vi.fn(() => token);
  vi.stubGlobal("crypto", { randomUUID });
  return randomUUID;
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("affiliate visitor token", () => {
  it.each([
    VALID_TOKEN,
    VALID_TOKEN.toUpperCase(),
    "123e4567-e89b-12d3-a456-426614174000",
    "123e4567-e89b-52d3-b456-426614174000",
  ])("aceita UUID armazenado válido: %s", (token) => {
    const storage = installStorage(token);

    expect(getStoredAffiliateVisitorToken()).toBe(token);
    expect(storage.getItem).toHaveBeenCalledOnce();
    expect(storage.getItem).toHaveBeenCalledWith(TOKEN_KEY);
  });

  it.each([
    null,
    "",
    "token-arbitrario",
    "123e4567-e89b-72d3-a456-426614174000",
    "123e4567-e89b-42d3-c456-426614174000",
    "123e4567e89b42d3a456426614174000",
  ])("rejeita token armazenado inválido: %s", (token) => {
    installStorage(token);

    expect(getStoredAffiliateVisitorToken()).toBeNull();
  });

  it("retorna null quando a leitura do storage falha", () => {
    installStorage(null, { readError: new Error("storage bloqueado") });

    expect(getStoredAffiliateVisitorToken()).toBeNull();
  });

  it("reutiliza token existente sem gerar ou sobrescrever", () => {
    const storage = installStorage(VALID_TOKEN);
    const randomUUID = installCrypto();

    expect(ensureAffiliateVisitorToken()).toBe(VALID_TOKEN);
    expect(randomUUID).not.toHaveBeenCalled();
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("gera, persiste e retorna um novo token", () => {
    const storage = installStorage(null);
    const randomUUID = installCrypto();

    expect(ensureAffiliateVisitorToken()).toBe(GENERATED_TOKEN);
    expect(randomUUID).toHaveBeenCalledOnce();
    expect(storage.setItem).toHaveBeenCalledOnce();
    expect(storage.setItem).toHaveBeenCalledWith(TOKEN_KEY, GENERATED_TOKEN);
  });

  it("retorna o token gerado mesmo quando a gravação falha", () => {
    const storage = installStorage(null, {
      writeError: new Error("quota indisponível"),
    });
    installCrypto();

    expect(ensureAffiliateVisitorToken()).toBe(GENERATED_TOKEN);
    expect(storage.setItem).toHaveBeenCalledWith(TOKEN_KEY, GENERATED_TOKEN);
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  clearHostedCheckoutIdempotencyKey,
  getHostedCheckoutIdempotencyKey,
} from "./hosted-checkout-idempotency";

const SUBJECT_ID = "123e4567-e89b-42d3-a456-426614174000";
const LICENSE_ID = "7aa48813-4885-4bc9-9e6f-8dfb32bdba73";
const EXISTING_KEY = "550e8400-e29b-41d4-a716-446655440000";
const GENERATED_KEY = "9b2c4d6e-8f10-4a12-b345-6789abcdef01";

interface EnvironmentOptions {
  readonly storedKey?: string | null;
  readonly readError?: Error;
  readonly writeError?: Error;
  readonly removeError?: Error;
}

const installEnvironment = (options: EnvironmentOptions = {}) => {
  const getItem = vi.fn(() => {
    if (options.readError) throw options.readError;
    return options.storedKey ?? null;
  });
  const setItem = vi.fn(() => {
    if (options.writeError) throw options.writeError;
  });
  const removeItem = vi.fn(() => {
    if (options.removeError) throw options.removeError;
  });
  const randomUUID = vi.fn(() => GENERATED_KEY);

  vi.stubGlobal("window", {
    sessionStorage: { getItem, setItem, removeItem },
  });
  vi.stubGlobal("crypto", { randomUUID });

  return { getItem, setItem, removeItem, randomUUID };
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("getHostedCheckoutIdempotencyKey", () => {
  it("reutiliza UUID persistido para o mesmo produto e licença", () => {
    const environment = installEnvironment({ storedKey: EXISTING_KEY });

    expect(
      getHostedCheckoutIdempotencyKey(
        "digital_product",
        SUBJECT_ID,
        LICENSE_ID,
      ),
    ).toBe(EXISTING_KEY);
    expect(environment.getItem).toHaveBeenCalledWith(
      `hosted-checkout:digital_product:${SUBJECT_ID}:${LICENSE_ID}`,
    );
    expect(environment.randomUUID).not.toHaveBeenCalled();
    expect(environment.setItem).not.toHaveBeenCalled();
  });

  it("substitui valor persistido inválido por UUID novo", () => {
    const environment = installEnvironment({ storedKey: "invalid-key" });

    expect(
      getHostedCheckoutIdempotencyKey(
        "digital_product",
        SUBJECT_ID,
        LICENSE_ID,
      ),
    ).toBe(GENERATED_KEY);
    expect(environment.randomUUID).toHaveBeenCalledOnce();
    expect(environment.setItem).toHaveBeenCalledWith(
      `hosted-checkout:digital_product:${SUBJECT_ID}:${LICENSE_ID}`,
      GENERATED_KEY,
    );
  });

  it("isola curso sem licença usando o segmento none", () => {
    const environment = installEnvironment();

    expect(getHostedCheckoutIdempotencyKey("course", SUBJECT_ID, null)).toBe(
      GENERATED_KEY,
    );
    expect(environment.setItem).toHaveBeenCalledWith(
      `hosted-checkout:course:${SUBJECT_ID}:none`,
      GENERATED_KEY,
    );
  });

  it("continua quando a leitura do sessionStorage falha", () => {
    const environment = installEnvironment({
      readError: new Error("sessionStorage bloqueado"),
    });

    expect(getHostedCheckoutIdempotencyKey("course", SUBJECT_ID, null)).toBe(
      GENERATED_KEY,
    );
    expect(environment.randomUUID).toHaveBeenCalledOnce();
    expect(environment.setItem).toHaveBeenCalledWith(
      `hosted-checkout:course:${SUBJECT_ID}:none`,
      GENERATED_KEY,
    );
  });

  it("continua quando a gravação do sessionStorage falha", () => {
    const environment = installEnvironment({
      writeError: new Error("quota indisponível"),
    });

    expect(getHostedCheckoutIdempotencyKey("course", SUBJECT_ID, null)).toBe(
      GENERATED_KEY,
    );
    expect(environment.setItem).toHaveBeenCalledOnce();
  });
});

describe("clearHostedCheckoutIdempotencyKey", () => {
  it("remove somente a chave correspondente ao item", () => {
    const environment = installEnvironment();

    clearHostedCheckoutIdempotencyKey(
      "digital_product",
      SUBJECT_ID,
      LICENSE_ID,
    );

    expect(environment.removeItem).toHaveBeenCalledWith(
      `hosted-checkout:digital_product:${SUBJECT_ID}:${LICENSE_ID}`,
    );
  });

  it("não propaga falha de remoção do sessionStorage", () => {
    installEnvironment({ removeError: new Error("storage indisponível") });

    expect(() =>
      clearHostedCheckoutIdempotencyKey("course", SUBJECT_ID, null),
    ).not.toThrow();
  });
});

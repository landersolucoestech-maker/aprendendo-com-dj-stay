import { describe, expect, it } from "vitest";
import { z } from "zod";

import { DataContractError, parseDataContract } from "@/contracts/contract-error";

import { getErrorMessage } from "./error-message";

const createContractError = (): DataContractError => {
  try {
    parseDataContract(z.object({ id: z.string().uuid() }), { id: "invalido" }, "payload de teste");
    throw new Error("A validação deveria falhar.");
  } catch (error) {
    if (error instanceof DataContractError) return error;
    throw error;
  }
};

describe("getErrorMessage", () => {
  it("sanitiza DataContractError sem expor contexto ou issues", () => {
    const error = createContractError();
    const message = getErrorMessage(error);

    expect(message).toBe(
      "Os dados recebidos não puderam ser validados. Atualize a página e tente novamente.",
    );
    expect(message).not.toContain(error.context);
    expect(message).not.toContain(error.message);
  });

  it("preserva mensagem explícita de Error", () => {
    expect(getErrorMessage(new Error("Falha específica da operação."))).toBe(
      "Falha específica da operação.",
    );
  });

  it.each([
    [
      { message: "RATE_LIMITED", code: "P0001" },
      "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.",
    ],
    [
      { message: "RATE_LIMIT_CONTEXT_REQUIRED", code: "P0001" },
      "Não foi possível validar a origem da solicitação. Atualize a página e tente novamente.",
    ],
    [
      new Error("RATE_LIMIT_CONTEXT_INVALID"),
      "Não foi possível validar a origem da solicitação. Atualize a página e tente novamente.",
    ],
  ])("mapeia erro público de quota sem expor o token técnico", (error, expected) => {
    const message = getErrorMessage(error);

    expect(message).toBe(expected);
    expect(message).not.toContain("RATE_LIMIT");
  });

  it("não expõe mensagem de objeto estruturado desconhecido", () => {
    expect(
      getErrorMessage({
        message: "internal database detail",
        details: "private.anonymous_mutation_rate_limits",
      }),
    ).toBe("A operação não pôde ser concluída. Tente novamente.");
  });

  it.each([new Error(""), new Error("   "), "erro textual", null, undefined, 42])(
    "aplica fallback padrão para valor não utilizável: %s",
    (error) => {
      expect(getErrorMessage(error)).toBe(
        "A operação não pôde ser concluída. Tente novamente.",
      );
    },
  );

  it("aplica fallback customizado", () => {
    expect(getErrorMessage({ reason: "desconhecido" }, "Mensagem alternativa.")).toBe(
      "Mensagem alternativa.",
    );
  });
});

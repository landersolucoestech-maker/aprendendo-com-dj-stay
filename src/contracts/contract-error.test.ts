import { describe, expect, it } from "vitest";
import { z } from "zod";

import { DataContractError, parseDataContract } from "./contract-error";

const payloadSchema = z.object({
  name: z.string().trim().min(1),
  quantity: z.number().int().positive(),
});

describe("parseDataContract", () => {
  it("retorna o payload validado e transformado", () => {
    expect(
      parseDataContract(
        payloadSchema,
        { name: "  Produto  ", quantity: 2 },
        "produto de teste",
      ),
    ).toEqual({ name: "Produto", quantity: 2 });
  });

  it("lança DataContractError com contexto e issues Zod", () => {
    try {
      parseDataContract(
        payloadSchema,
        { name: "", quantity: 0 },
        "produto de teste",
      );
      throw new Error("A validação deveria falhar.");
    } catch (error) {
      expect(error).toBeInstanceOf(DataContractError);
      const contractError = error as DataContractError;
      expect(contractError.name).toBe("DataContractError");
      expect(contractError.message).toBe(
        "Contrato de dados inválido em produto de teste.",
      );
      expect(contractError.context).toBe("produto de teste");
      expect(contractError.issues.map((issue) => issue.path.join("."))).toEqual(
        expect.arrayContaining(["name", "quantity"]),
      );
      expect(contractError.issues.every((issue) => issue.code.length > 0)).toBe(
        true,
      );
    }
  });
});

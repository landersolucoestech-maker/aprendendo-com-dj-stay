import type { ZodError, ZodType } from "zod";

export class DataContractError extends Error {
  readonly context: string;
  readonly issues: ZodError["issues"];

  constructor(context: string, error: ZodError) {
    super(`Contrato de dados inválido em ${context}.`);
    this.name = "DataContractError";
    this.context = context;
    this.issues = error.issues;
  }
}

export const parseDataContract = <T>(schema: ZodType<T>, value: unknown, context: string): T => {
  const result = schema.safeParse(value);

  if (!result.success) {
    throw new DataContractError(context, result.error);
  }

  return result.data;
};

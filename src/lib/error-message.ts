import { DataContractError } from "@/contracts/contract-error";

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof DataContractError) {
    return "Os dados recebidos não puderam ser validados. Atualize a página e tente novamente.";
  }

  return fallback;
}

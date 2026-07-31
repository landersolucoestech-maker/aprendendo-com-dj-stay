import { DataContractError } from "@/contracts/contract-error";

export function getErrorMessage(
  error: unknown,
  fallback = "A operação não pôde ser concluída. Tente novamente.",
): string {
  if (error instanceof DataContractError) {
    return "Os dados recebidos não puderam ser validados. Atualize a página e tente novamente.";
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}

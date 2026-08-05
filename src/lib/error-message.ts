import { DataContractError } from "@/contracts/contract-error";

const PUBLIC_DATABASE_ERROR_MESSAGES = new Map<string, string>([
  [
    "RATE_LIMITED",
    "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.",
  ],
  [
    "RATE_LIMIT_CONTEXT_REQUIRED",
    "Não foi possível validar a origem da solicitação. Atualize a página e tente novamente.",
  ],
  [
    "RATE_LIMIT_CONTEXT_INVALID",
    "Não foi possível validar a origem da solicitação. Atualize a página e tente novamente.",
  ],
]);

const getStructuredErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message.trim();

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message.trim();
  }

  return "";
};

export function getErrorMessage(
  error: unknown,
  fallback = "A operação não pôde ser concluída. Tente novamente.",
): string {
  if (error instanceof DataContractError) {
    return "Os dados recebidos não puderam ser validados. Atualize a página e tente novamente.";
  }

  const structuredMessage = getStructuredErrorMessage(error);
  const mappedDatabaseMessage = PUBLIC_DATABASE_ERROR_MESSAGES.get(structuredMessage);
  if (mappedDatabaseMessage) return mappedDatabaseMessage;

  if (error instanceof Error && structuredMessage.length > 0) {
    return structuredMessage;
  }

  return fallback;
}

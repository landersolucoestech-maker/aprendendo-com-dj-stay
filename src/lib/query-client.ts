import { QueryClient } from "@tanstack/react-query";

const getHttpStatus = (error: unknown): number | null => {
  if (typeof error !== "object" || error === null) return null;

  for (const key of ["status", "statusCode"] as const) {
    const value = Reflect.get(error, key);
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }

  return null;
};

const shouldRetryQuery = (failureCount: number, error: unknown): boolean => {
  if (failureCount >= 1) return false;

  const status = getHttpStatus(error);
  if (status === null) return true;

  return status === 408 || status === 429 || status >= 500;
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 10 * 60_000,
      retry: shouldRetryQuery,
      retryDelay: 1_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      networkMode: "online",
      structuralSharing: true,
      throwOnError: false,
    },
    mutations: {
      retry: false,
      networkMode: "online",
      throwOnError: false,
    },
  },
});

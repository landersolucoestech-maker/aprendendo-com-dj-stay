const CLIENT_INSTANCE_STORAGE_KEY = "lesson-progress-client-instance";
const SEQUENCE_STORAGE_PREFIX = "lesson-progress-sequence:";
const PROGRESS_CHANNEL_NAME = "lesson-progress";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let runtimeClientInstanceId: string | null = null;
const runtimeSequences = new Map<string, number>();

const createUuid = (): string => {
  if (typeof crypto === "undefined" || typeof crypto.randomUUID !== "function") {
    throw new Error("Este navegador não oferece geração segura de identificadores.");
  }

  return crypto.randomUUID();
};

const readSessionValue = (key: string): string | null => {
  if (typeof window === "undefined") return null;

  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeSessionValue = (key: string, value: string): void => {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // O progresso continua funcional na memória quando o armazenamento está indisponível.
  }
};

export const getLessonProgressClientInstanceId = (): string => {
  if (runtimeClientInstanceId !== null) {
    return runtimeClientInstanceId;
  }

  const storedClientInstanceId = readSessionValue(CLIENT_INSTANCE_STORAGE_KEY);
  runtimeClientInstanceId =
    storedClientInstanceId !== null && UUID_PATTERN.test(storedClientInstanceId)
      ? storedClientInstanceId
      : createUuid();

  writeSessionValue(CLIENT_INSTANCE_STORAGE_KEY, runtimeClientInstanceId);
  return runtimeClientInstanceId;
};

export const createLessonProgressEventId = (): string => createUuid();

export const nextLessonProgressSequence = (lessonId: string): number => {
  const clientInstanceId = getLessonProgressClientInstanceId();
  const storageKey = `${SEQUENCE_STORAGE_PREFIX}${clientInstanceId}:${lessonId}`;
  const storedSequence = Number.parseInt(readSessionValue(storageKey) ?? "0", 10);
  const currentSequence = Math.max(
    runtimeSequences.get(lessonId) ?? 0,
    Number.isSafeInteger(storedSequence) && storedSequence > 0 ? storedSequence : 0,
  );
  const nextSequence = currentSequence + 1;

  runtimeSequences.set(lessonId, nextSequence);
  writeSessionValue(storageKey, String(nextSequence));
  return nextSequence;
};

export interface LessonProgressBroadcast {
  lessonId: string;
  revision: number;
  clientInstanceId: string;
}

export const publishLessonProgressUpdate = (
  message: Omit<LessonProgressBroadcast, "clientInstanceId">,
): void => {
  if (typeof BroadcastChannel === "undefined") {
    return;
  }

  const channel = new BroadcastChannel(PROGRESS_CHANNEL_NAME);
  channel.postMessage({
    ...message,
    clientInstanceId: getLessonProgressClientInstanceId(),
  } satisfies LessonProgressBroadcast);
  channel.close();
};

export const subscribeLessonProgressUpdates = (
  listener: (message: LessonProgressBroadcast) => void,
): (() => void) => {
  if (typeof BroadcastChannel === "undefined") {
    return () => undefined;
  }

  const currentClientInstanceId = getLessonProgressClientInstanceId();
  const channel = new BroadcastChannel(PROGRESS_CHANNEL_NAME);
  channel.onmessage = (event: MessageEvent<LessonProgressBroadcast>) => {
    const message = event.data;
    if (
      message !== null &&
      typeof message === "object" &&
      typeof message.lessonId === "string" &&
      typeof message.revision === "number" &&
      message.clientInstanceId !== currentClientInstanceId
    ) {
      listener(message);
    }
  };

  return () => channel.close();
};

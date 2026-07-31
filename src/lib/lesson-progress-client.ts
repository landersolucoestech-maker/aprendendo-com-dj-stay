const CLIENT_INSTANCE_STORAGE_KEY = "lesson-progress-client-instance";
const SEQUENCE_STORAGE_PREFIX = "lesson-progress-sequence:";
const PROGRESS_CHANNEL_NAME = "lesson-progress";

let runtimeClientInstanceId: string | null = null;
const runtimeSequences = new Map<string, number>();

const createUuid = (): string => {
  if (typeof crypto === "undefined" || typeof crypto.randomUUID !== "function") {
    throw new Error("Este navegador não oferece geração segura de identificadores.");
  }

  return crypto.randomUUID();
};

export const getLessonProgressClientInstanceId = (): string => {
  if (runtimeClientInstanceId !== null) {
    return runtimeClientInstanceId;
  }

  runtimeClientInstanceId = createUuid();

  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(CLIENT_INSTANCE_STORAGE_KEY, runtimeClientInstanceId);
  }

  return runtimeClientInstanceId;
};

export const createLessonProgressEventId = (): string => createUuid();

export const nextLessonProgressSequence = (lessonId: string): number => {
  const nextSequence = (runtimeSequences.get(lessonId) ?? 0) + 1;
  runtimeSequences.set(lessonId, nextSequence);

  if (typeof window !== "undefined") {
    const clientInstanceId = getLessonProgressClientInstanceId();
    window.sessionStorage.setItem(
      `${SEQUENCE_STORAGE_PREFIX}${clientInstanceId}:${lessonId}`,
      String(nextSequence),
    );
  }

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

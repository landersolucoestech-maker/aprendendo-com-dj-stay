import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import type { LessonProgressEventType } from "@/contracts/learning";
import { useSaveLessonProgressEvent } from "@/hooks/useUserProgress";
import {
  createLessonProgressEventId,
  getLessonProgressClientInstanceId,
  nextLessonProgressSequence,
  subscribeLessonProgressUpdates,
} from "@/lib/lesson-progress-client";

export type ProgressSaveStatus = "idle" | "saving" | "saved" | "error";

interface LessonProgressTrackerInput {
  lessonId: string;
  initialCompleted: boolean;
  initialProgressPercent: number;
  initialWatchedSeconds: number;
  configuredDurationMinutes: number | null;
}

interface PositionUpdate {
  positionSeconds: number;
  durationSeconds?: number;
}

const normalizePosition = (value: number): number =>
  Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;

const normalizeDuration = (value: number): number =>
  Number.isFinite(value) ? Math.max(1, Math.floor(value)) : 1;

export const useLessonProgressTracker = ({
  lessonId,
  initialCompleted,
  initialProgressPercent,
  initialWatchedSeconds,
  configuredDurationMinutes,
}: LessonProgressTrackerInput) => {
  const queryClient = useQueryClient();
  const saveProgressEvent = useSaveLessonProgressEvent();
  const [progressPercent, setProgressPercent] = useState(initialProgressPercent);
  const [completed, setCompleted] = useState(initialCompleted);
  const [saveStatus, setSaveStatus] = useState<ProgressSaveStatus>("idle");
  const [isPlaying, setIsPlaying] = useState(false);
  const positionRef = useRef(initialWatchedSeconds);
  const durationRef = useRef(
    configuredDurationMinutes === null ? 1 : configuredDurationMinutes * 60,
  );
  const lastHeartbeatPositionRef = useRef(initialWatchedSeconds);
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const mountedRef = useRef(true);

  useEffect(() => {
    setProgressPercent((current) => Math.max(current, initialProgressPercent));
    setCompleted((current) => current || initialCompleted);
    positionRef.current = Math.max(positionRef.current, initialWatchedSeconds);
  }, [initialCompleted, initialProgressPercent, initialWatchedSeconds]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const observePosition = useCallback(({ positionSeconds, durationSeconds }: PositionUpdate) => {
    positionRef.current = normalizePosition(positionSeconds);
    if (durationSeconds !== undefined && durationSeconds > 0) {
      durationRef.current = normalizeDuration(durationSeconds);
    }
  }, []);

  const persist = useCallback(
    (eventType: LessonProgressEventType): Promise<void> => {
      const positionSeconds = normalizePosition(positionRef.current);
      const durationSeconds = normalizeDuration(durationRef.current);
      const payload = {
        lessonId,
        eventId: createLessonProgressEventId(),
        clientInstanceId: getLessonProgressClientInstanceId(),
        eventSequence: nextLessonProgressSequence(lessonId),
        eventType,
        positionSeconds: Math.min(positionSeconds, durationSeconds + 30),
        durationSeconds,
        observedAt: new Date().toISOString(),
      } as const;

      const operation = queueRef.current
        .catch(() => undefined)
        .then(async () => {
          if (mountedRef.current) setSaveStatus("saving");
          const aggregate = await saveProgressEvent.mutateAsync(payload);
          lastHeartbeatPositionRef.current = Math.max(
            lastHeartbeatPositionRef.current,
            aggregate.tempo_assistido,
          );
          if (mountedRef.current) {
            setProgressPercent(aggregate.progresso_percentual);
            setCompleted(aggregate.completada);
            setSaveStatus("saved");
          }
        })
        .catch((error: unknown) => {
          if (mountedRef.current) setSaveStatus("error");
          throw error;
        });

      queueRef.current = operation.then(
        () => undefined,
        () => undefined,
      );
      return operation;
    },
    [lessonId, saveProgressEvent],
  );

  const handlePlay = useCallback(() => setIsPlaying(true), []);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
    if (positionRef.current > 0) void persist("pause").catch(() => undefined);
  }, [persist]);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    positionRef.current = Math.max(positionRef.current, durationRef.current);
    void persist("ended").catch(() => undefined);
  }, [persist]);

  const completeManually = useCallback(
    () => persist("manual_complete"),
    [persist],
  );

  const acknowledgeReading = useCallback(
    () => persist("reading_acknowledgement"),
    [persist],
  );

  useEffect(() => {
    if (!isPlaying) return;

    const interval = window.setInterval(() => {
      if (positionRef.current <= lastHeartbeatPositionRef.current) return;
      void persist("heartbeat").catch(() => undefined);
    }, 15_000);

    return () => window.clearInterval(interval);
  }, [isPlaying, persist]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && positionRef.current > 0) {
        void persist("visibility_hidden").catch(() => undefined);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [persist]);

  useEffect(
    () =>
      subscribeLessonProgressUpdates((message) => {
        if (message.lessonId !== lessonId) return;
        void Promise.all([
          queryClient.invalidateQueries({ queryKey: ["user-progress"] }),
          queryClient.invalidateQueries({ queryKey: ["recent-activities"] }),
          queryClient.invalidateQueries({ queryKey: ["modules"] }),
        ]);
      }),
    [lessonId, queryClient],
  );

  return {
    progressPercent,
    completed,
    saveStatus,
    isPlaying,
    currentPositionSeconds: positionRef.current,
    observePosition,
    persist,
    handlePlay,
    handlePause,
    handleEnded,
    completeManually,
    acknowledgeReading,
    isSaving: saveStatus === "saving",
  };
};

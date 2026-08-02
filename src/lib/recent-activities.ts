import { z } from "zod";

import { recentProgressResponseSchema } from "@/contracts/learning";
import { formatAppRelativeTime, type TemporalInput } from "@/lib/date-time";

export const DEFAULT_RECENT_ACTIVITY_LIMIT = 10;
export const MAX_RECENT_ACTIVITY_LIMIT = 100;

export interface RecentActivity {
  readonly id: string;
  readonly activity: string;
  readonly time: string;
  readonly type: "lesson_completed" | "lesson_started";
  readonly updatedAt: string;
  readonly lessonTitle: string;
  readonly moduleTitle: string;
  readonly progressPercent: number;
  readonly completed: boolean;
}

export type RecentProgressRow = z.infer<typeof recentProgressResponseSchema>[number];

export const normalizeRecentActivityLimit = (limit: number): number => {
  if (!Number.isFinite(limit)) return DEFAULT_RECENT_ACTIVITY_LIMIT;

  return Math.min(
    MAX_RECENT_ACTIVITY_LIMIT,
    Math.max(1, Math.trunc(limit)),
  );
};

export const toRecentActivity = (
  progress: RecentProgressRow,
  now: TemporalInput = Date.now(),
): RecentActivity => {
  const lessonTitle = progress.aulas.titulo;
  const moduleTitle = progress.aulas.modulos.titulo;
  const activity = progress.completada
    ? `Completou "${lessonTitle}" em ${moduleTitle}`
    : progress.progresso_percentual > 0
      ? `Assistiu ${progress.progresso_percentual}% de "${lessonTitle}"`
      : `Iniciou "${lessonTitle}" em ${moduleTitle}`;

  return {
    id: progress.id,
    activity,
    time: formatAppRelativeTime(progress.updated_at, now),
    type: progress.completada ? "lesson_completed" : "lesson_started",
    updatedAt: progress.updated_at,
    lessonTitle,
    moduleTitle,
    progressPercent: progress.progresso_percentual,
    completed: progress.completada,
  };
};

export const toRecentActivities = (
  progressRows: readonly RecentProgressRow[],
  now: TemporalInput = Date.now(),
): RecentActivity[] => progressRows.map((progress) => toRecentActivity(progress, now));

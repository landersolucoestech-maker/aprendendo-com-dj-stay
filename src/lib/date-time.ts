export const APP_LOCALE = "pt-BR";
export const APP_TIME_ZONE = "America/Sao_Paulo";

export type TemporalInput = string | number | Date;

type DateStyle = "full" | "long" | "medium" | "short";
type TimeStyle = "full" | "long" | "medium" | "short";

interface DateFormatOptions {
  readonly fallback?: string;
  readonly dateStyle?: DateStyle;
}

interface TimeFormatOptions {
  readonly fallback?: string;
  readonly timeStyle?: TimeStyle;
}

interface DateTimeFormatOptions extends DateFormatOptions, TimeFormatOptions {}

const formatterCache = new Map<string, Intl.DateTimeFormat>();
const relativeFormatter = new Intl.RelativeTimeFormat(APP_LOCALE, {
  numeric: "auto",
});

const toValidDate = (value: TemporalInput | null | undefined): Date | null => {
  if (value === null || value === undefined || value === "") return null;

  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getDateTimeFormatter = (
  dateStyle: DateStyle | undefined,
  timeStyle: TimeStyle | undefined,
): Intl.DateTimeFormat => {
  const key = `${dateStyle ?? "no-date"}:${timeStyle ?? "no-time"}`;
  const existing = formatterCache.get(key);
  if (existing) return existing;

  const formatter = new Intl.DateTimeFormat(APP_LOCALE, {
    ...(dateStyle ? { dateStyle } : {}),
    ...(timeStyle ? { timeStyle } : {}),
    timeZone: APP_TIME_ZONE,
  });
  formatterCache.set(key, formatter);
  return formatter;
};

export const formatAppDate = (
  value: TemporalInput | null | undefined,
  options: DateFormatOptions = {},
): string => {
  const date = toValidDate(value);
  if (!date) return options.fallback ?? "—";

  return getDateTimeFormatter(options.dateStyle ?? "medium", undefined).format(
    date,
  );
};

export const formatAppTime = (
  value: TemporalInput | null | undefined,
  options: TimeFormatOptions = {},
): string => {
  const date = toValidDate(value);
  if (!date) return options.fallback ?? "—";

  return getDateTimeFormatter(undefined, options.timeStyle ?? "short").format(
    date,
  );
};

export const formatAppDateTime = (
  value: TemporalInput | null | undefined,
  options: DateTimeFormatOptions = {},
): string => {
  const date = toValidDate(value);
  if (!date) return options.fallback ?? "—";

  return getDateTimeFormatter(
    options.dateStyle ?? "short",
    options.timeStyle ?? "short",
  ).format(date);
};

export const formatAppRelativeTime = (
  value: TemporalInput | null | undefined,
  now: TemporalInput = Date.now(),
  fallback = "—",
): string => {
  const date = toValidDate(value);
  const reference = toValidDate(now);
  if (!date || !reference) return fallback;

  const differenceSeconds = Math.round(
    (date.getTime() - reference.getTime()) / 1000,
  );
  const absoluteSeconds = Math.abs(differenceSeconds);

  if (absoluteSeconds < 60) return relativeFormatter.format(0, "second");
  if (absoluteSeconds < 60 * 60) {
    return relativeFormatter.format(Math.round(differenceSeconds / 60), "minute");
  }
  if (absoluteSeconds < 60 * 60 * 24) {
    return relativeFormatter.format(Math.round(differenceSeconds / 3600), "hour");
  }
  if (absoluteSeconds < 60 * 60 * 24 * 30) {
    return relativeFormatter.format(Math.round(differenceSeconds / 86400), "day");
  }
  if (absoluteSeconds < 60 * 60 * 24 * 365) {
    return relativeFormatter.format(
      Math.round(differenceSeconds / (86400 * 30)),
      "month",
    );
  }
  return relativeFormatter.format(
    Math.round(differenceSeconds / (86400 * 365)),
    "year",
  );
};

export const toUtcIsoString = (
  value: TemporalInput | null | undefined,
): string | null => toValidDate(value)?.toISOString() ?? null;

import type { LessonMediaProvider } from "@/contracts/playback";

export type ExternalMediaProvider = Exclude<LessonMediaProvider, "private_asset">;
export type ExternalPlayerState = "playing" | "paused" | "ended";

export interface ExternalPlayerMessage {
  currentTime?: number;
  duration?: number;
  state?: ExternalPlayerState;
}

const parsePayload = (data: unknown): Record<string, unknown> | null => {
  if (typeof data === "string") {
    try {
      const parsed: unknown = JSON.parse(data);
      return typeof parsed === "object" && parsed !== null
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }

  return typeof data === "object" && data !== null
    ? (data as Record<string, unknown>)
    : null;
};

const finiteNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;

export const buildTrackableEmbedUrl = (
  rawUrl: string,
  provider: ExternalMediaProvider,
  playerId: string,
): string => {
  const url = new URL(rawUrl);

  if (provider === "youtube") {
    url.searchParams.set("enablejsapi", "1");
    url.searchParams.set("origin", window.location.origin);
  } else {
    url.searchParams.set("api", "1");
    url.searchParams.set("player_id", playerId);
  }

  return url.toString();
};

export const initializeExternalPlayer = (
  iframe: HTMLIFrameElement,
  provider: ExternalMediaProvider,
  playerId: string,
): void => {
  if (!iframe.contentWindow) return;

  if (provider === "youtube") {
    iframe.contentWindow.postMessage(JSON.stringify({ event: "listening", id: playerId }), "*");
    iframe.contentWindow.postMessage(
      JSON.stringify({ event: "command", func: "addEventListener", args: ["onStateChange"] }),
      "*",
    );
    return;
  }

  for (const eventName of ["play", "pause", "ended", "timeupdate"]) {
    iframe.contentWindow.postMessage({ method: "addEventListener", value: eventName }, "*");
  }
};

export const requestExternalPlayerTime = (
  iframe: HTMLIFrameElement,
  provider: ExternalMediaProvider,
): void => {
  if (!iframe.contentWindow || provider !== "youtube") return;

  iframe.contentWindow.postMessage(
    JSON.stringify({ event: "command", func: "getCurrentTime", args: [] }),
    "*",
  );
  iframe.contentWindow.postMessage(
    JSON.stringify({ event: "command", func: "getDuration", args: [] }),
    "*",
  );
};

export const parseExternalPlayerMessage = (
  event: MessageEvent,
  provider: ExternalMediaProvider,
): ExternalPlayerMessage | null => {
  const payload = parsePayload(event.data);
  if (!payload) return null;

  if (provider === "youtube") {
    if (!event.origin.endsWith("youtube-nocookie.com") && !event.origin.endsWith("youtube.com")) {
      return null;
    }

    const info =
      typeof payload.info === "object" && payload.info !== null
        ? (payload.info as Record<string, unknown>)
        : null;
    const playerState = finiteNumber(info?.playerState ?? payload.info);
    const message: ExternalPlayerMessage = {};

    const currentTime = finiteNumber(info?.currentTime);
    const duration = finiteNumber(info?.duration);
    if (currentTime !== undefined) message.currentTime = currentTime;
    if (duration !== undefined && duration > 0) message.duration = duration;

    if (playerState === 1) message.state = "playing";
    if (playerState === 2) message.state = "paused";
    if (playerState === 0) message.state = "ended";

    return Object.keys(message).length > 0 ? message : null;
  }

  if (event.origin !== "https://player.vimeo.com") return null;

  const eventName = typeof payload.event === "string" ? payload.event : null;
  const data =
    typeof payload.data === "object" && payload.data !== null
      ? (payload.data as Record<string, unknown>)
      : null;
  const message: ExternalPlayerMessage = {};

  const currentTime = finiteNumber(data?.seconds);
  const duration = finiteNumber(data?.duration);
  if (currentTime !== undefined) message.currentTime = currentTime;
  if (duration !== undefined && duration > 0) message.duration = duration;
  if (eventName === "play") message.state = "playing";
  if (eventName === "pause") message.state = "paused";
  if (eventName === "ended") message.state = "ended";

  return Object.keys(message).length > 0 ? message : null;
};

import { useEffect, useMemo, useRef } from "react";

import type { LessonPlaybackSession } from "@/hooks/useLessonPlayback";
import type { Lesson } from "@/hooks/useLessons";
import {
  buildTrackableEmbedUrl,
  initializeExternalPlayer,
  parseExternalPlayerMessage,
  requestExternalPlayerTime,
  type ExternalMediaProvider,
} from "@/lib/external-player-bridge";

interface ExternalLessonMediaProps {
  lesson: Lesson;
  playback: LessonPlaybackSession;
  isPlaying: boolean;
  onPosition: (positionSeconds: number, durationSeconds?: number) => void;
  onPlay: () => void;
  onPause: () => void;
  onEnded: () => void;
}

const ExternalLessonMedia = ({
  lesson,
  playback,
  isPlaying,
  onPosition,
  onPlay,
  onPause,
  onEnded,
}: ExternalLessonMediaProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const provider = playback.provider as ExternalMediaProvider;
  const playerId = `lesson-player-${lesson.id}`;
  const embedUrl = useMemo(
    () => (playback.embedUrl ? buildTrackableEmbedUrl(playback.embedUrl, provider, playerId) : null),
    [playback.embedUrl, playerId, provider],
  );

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = parseExternalPlayerMessage(event, provider);
      if (!message) return;

      if (message.currentTime !== undefined) {
        if (message.duration === undefined) {
          onPosition(message.currentTime);
        } else {
          onPosition(message.currentTime, message.duration);
        }
      }

      if (message.state === "playing") onPlay();
      if (message.state === "paused") onPause();
      if (message.state === "ended") onEnded();
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onEnded, onPause, onPlay, onPosition, provider]);

  useEffect(() => {
    if (provider !== "youtube" || !isPlaying) return;

    const interval = window.setInterval(() => {
      if (iframeRef.current) requestExternalPlayerTime(iframeRef.current, provider);
    }, 5_000);

    return () => window.clearInterval(interval);
  }, [isPlaying, provider]);

  if (!embedUrl) return null;

  return (
    <iframe
      ref={iframeRef}
      id={playerId}
      className="h-full w-full"
      src={embedUrl}
      title={`Reprodutor da aula ${lesson.title}`}
      sandbox="allow-scripts allow-same-origin allow-presentation"
      referrerPolicy="no-referrer"
      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
      allowFullScreen
      onLoad={() => {
        if (iframeRef.current) initializeExternalPlayer(iframeRef.current, provider, playerId);
      }}
    />
  );
};

export default ExternalLessonMedia;

import type { Lesson } from "@/hooks/useLessons";

interface PrivateLessonMediaProps {
  lesson: Lesson;
  streamUrl: string;
  watchedSeconds: number;
  onPosition: (positionSeconds: number, durationSeconds: number) => void;
  onPlay: () => void;
  onPause: () => void;
  onEnded: () => void;
}

const PrivateLessonMedia = ({ lesson, streamUrl, watchedSeconds, onPosition, onPlay, onPause, onEnded }: PrivateLessonMediaProps) => {
  const load = (media: HTMLMediaElement) => {
    const duration = Number.isFinite(media.duration) && media.duration > 0 ? media.duration : 1;
    const target = Math.min(watchedSeconds, duration);
    if (target > 0) media.currentTime = target;
    onPosition(target, duration);
  };
  const update = (media: HTMLMediaElement) => {
    const duration = Number.isFinite(media.duration) && media.duration > 0 ? media.duration : 1;
    onPosition(media.currentTime, duration);
  };
  const shared = {
    src: streamUrl,
    controls: true,
    controlsList: "nodownload",
    preload: "metadata" as const,
    crossOrigin: "anonymous" as const,
    onLoadedMetadata: (event: React.SyntheticEvent<HTMLMediaElement>) => load(event.currentTarget),
    onTimeUpdate: (event: React.SyntheticEvent<HTMLMediaElement>) => update(event.currentTarget),
    onPlay,
    onPause,
    onEnded,
  };

  return lesson.contentKind === "audio" ? (
    <div className="flex h-full w-full items-center justify-center bg-gray-900 px-6">
      <audio {...shared} className="w-full max-w-3xl" aria-label={`Reprodutor de áudio da aula ${lesson.title}`} />
    </div>
  ) : (
    <video {...shared} className="h-full w-full bg-black" aria-label={`Reprodutor de vídeo da aula ${lesson.title}`} />
  );
};

export default PrivateLessonMedia;

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle, Clock3, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import PortalHeader from "@/components/portal/PortalHeader";
import { useLessonDetail, useUpdateLessonProgress } from "@/hooks/useStudentData";
import { useToast } from "@/hooks/use-toast";

function youtubeEmbed(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^&?/#]+)/i);
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

export default function Lesson() {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: lesson, isLoading, error } = useLessonDetail(lessonId);
  const updateProgress = useUpdateLessonProgress();
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const [progress, setProgress] = useState(0);
  const lastSavedRef = useRef(0);

  useEffect(() => {
    setProgress(Number(lesson?.progress?.progress_percent ?? 0));
  }, [lesson?.progress?.progress_percent]);

  const embedUrl = useMemo(() => lesson?.media_url ? youtubeEmbed(lesson.media_url) : null, [lesson?.media_url]);
  const courseId = lesson?.course_modules?.course_id;

  const persistMediaProgress = async (force = false) => {
    if (!lessonId || !mediaRef.current) return;
    const media = mediaRef.current;
    const duration = Number.isFinite(media.duration) ? media.duration : Number(lesson?.duration_seconds ?? 0);
    if (duration <= 0) return;
    const percent = Math.min(100, Math.max(0, (media.currentTime / duration) * 100));
    setProgress(percent);
    const now = Date.now();
    if (!force && now - lastSavedRef.current < 15000) return;
    lastSavedRef.current = now;
    try {
      await updateProgress.mutateAsync({
        lessonId,
        progressPercent: percent,
        watchedSeconds: Math.floor(media.currentTime),
        lastPositionSeconds: Math.floor(media.currentTime),
      });
    } catch (saveError) {
      console.error("Could not save lesson progress", saveError);
    }
  };

  const markComplete = async () => {
    if (!lessonId) return;
    try {
      await updateProgress.mutateAsync({
        lessonId,
        progressPercent: 100,
        watchedSeconds: Math.max(Number(lesson?.duration_seconds ?? 0), Number(lesson?.progress?.watched_seconds ?? 0)),
        lastPositionSeconds: Number(lesson?.duration_seconds ?? 0),
      });
      setProgress(100);
      toast({ title: "Aula concluída", description: "Seu progresso foi salvo." });
    } catch (completionError) {
      toast({ title: "Erro", description: completionError instanceof Error ? completionError.message : "Não foi possível concluir a aula.", variant: "destructive" });
    }
  };

  if (isLoading) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Carregando aula...</div>;
  if (error || !lesson) return <div className="min-h-screen bg-black text-white flex items-center justify-center"><div className="text-center"><p className="text-red-400 mb-4">Aula não encontrada ou acesso não autorizado.</p><Button onClick={() => navigate("/meus-cursos")}>Voltar aos cursos</Button></div></div>;

  return (
    <div className="min-h-screen bg-black text-white">
      <PortalHeader />
      <main className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/curso/${courseId}`)}><ArrowLeft className="w-5 h-5" /></Button>
          <div className="min-w-0"><p className="text-sm text-gray-400">{lesson.course_modules?.courses?.title} · {lesson.course_modules?.title}</p><h1 className="text-2xl md:text-3xl font-bold gradient-text truncate">{lesson.title}</h1></div>
        </div>

        <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
          <div className="space-y-6">
            <Card className="glass-card border-white/10 overflow-hidden">
              <CardContent className="p-0">
                {lesson.content_type === "text" ? (
                  <article className="prose prose-invert max-w-none p-6 md:p-8 whitespace-pre-wrap">{lesson.content || lesson.description || "Conteúdo textual não informado."}</article>
                ) : embedUrl ? (
                  <div className="aspect-video bg-gray-950"><iframe className="w-full h-full" src={embedUrl} title={lesson.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div>
                ) : lesson.content_type === "audio" && lesson.media_url ? (
                  <div className="p-8 min-h-56 flex items-center justify-center bg-gray-950"><audio ref={(node) => { mediaRef.current = node; }} className="w-full" controls src={lesson.media_url} onTimeUpdate={() => void persistMediaProgress()} onPause={() => void persistMediaProgress(true)} onEnded={() => void markComplete()} /></div>
                ) : lesson.media_url ? (
                  <div className="aspect-video bg-gray-950"><video ref={(node) => { mediaRef.current = node; }} className="w-full h-full" controls src={lesson.media_url} onLoadedMetadata={(event) => { const saved = Number(lesson.progress?.last_position_seconds ?? 0); if (saved > 0 && saved < event.currentTarget.duration) event.currentTarget.currentTime = saved; }} onTimeUpdate={() => void persistMediaProgress()} onPause={() => void persistMediaProgress(true)} onEnded={() => void markComplete()} /></div>
                ) : (
                  <div className="aspect-video bg-gray-950 flex items-center justify-center text-gray-500">Mídia não disponível.</div>
                )}
                <div className="p-6"><div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3"><div><h2 className="text-xl font-bold">{lesson.title}</h2><p className="text-gray-400 mt-2">{lesson.description}</p></div><span className="text-sm text-gray-500 flex items-center gap-1 shrink-0"><Clock3 className="w-4 h-4" />{Math.ceil(Number(lesson.duration_seconds || 0) / 60)} min</span></div></div>
              </CardContent>
            </Card>

            <Card className="glass-card border-white/10">
              <CardHeader><CardTitle className="text-white flex items-center gap-2"><FileText className="w-5 h-5" />Materiais adicionais</CardTitle></CardHeader>
              <CardContent>
                {!lesson.lesson_assets?.length && <p className="text-sm text-gray-500">Nenhum material adicional nesta aula.</p>}
                <div className="grid md:grid-cols-2 gap-3">
                  {lesson.lesson_assets?.map((asset: any) => (
                    <div key={asset.id} className="rounded-lg border border-white/10 p-4 flex items-center justify-between gap-3"><div className="min-w-0"><p className="font-medium truncate">{asset.title}</p><p className="text-xs text-gray-500">{asset.asset_type}{asset.file_size_bytes ? ` · ${(asset.file_size_bytes / 1024 / 1024).toFixed(1)} MB` : ""}</p></div>{asset.download_url && <Button asChild variant="outline" size="sm"><a href={asset.download_url} target="_blank" rel="noreferrer"><Download className="w-4 h-4 mr-2" />Abrir</a></Button>}</div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="glass-card border-white/10 lg:sticky lg:top-24">
            <CardHeader><CardTitle className="text-white text-lg">Progresso da aula</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2"><div className="flex justify-between text-sm"><span className="text-gray-400">Concluído</span><span>{Math.round(progress)}%</span></div><Progress value={progress} /></div>
              {progress >= 100 ? <div className="text-green-400 flex items-center justify-center gap-2 text-sm"><CheckCircle className="w-4 h-4" />Aula concluída</div> : <Button className="w-full" onClick={markComplete} disabled={updateProgress.isPending}><CheckCircle className="w-4 h-4 mr-2" />Marcar como concluída</Button>}
              <Button variant="outline" className="w-full border-white/20 bg-transparent" onClick={() => navigate(`/curso/${courseId}`)}>Voltar ao conteúdo</Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

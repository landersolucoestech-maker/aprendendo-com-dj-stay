import { CheckCircle2, Circle, Clock3, LockKeyhole } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import PortalHeader from "@/components/portal/PortalHeader";
import { useCourseLearning } from "@/hooks/useStudentData";

export default function CourseLearning() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, error } = useCourseLearning(courseId);

  if (isLoading) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Carregando curso...</div>;
  if (error || !data) return <div className="min-h-screen bg-black text-white flex items-center justify-center"><div className="text-center"><p className="text-red-400 mb-4">Não foi possível acessar este curso.</p><Button onClick={() => navigate("/meus-cursos")}>Voltar</Button></div></div>;

  const { course, enrollment } = data;
  const lessons = course.course_modules.flatMap((module: any) => module.lessons);
  const firstPending = lessons.find((lesson: any) => !lesson.progress?.completed) ?? lessons[0];

  return (
    <div className="min-h-screen bg-black text-white">
      <PortalHeader />
      <main className="container mx-auto px-4 py-8 space-y-8">
        <section className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
          <div>
            <p className="text-sm text-gray-400">Curso</p>
            <h1 className="text-3xl md:text-4xl font-bold gradient-text">{course.title}</h1>
            <p className="text-gray-300 mt-3 max-w-3xl">{course.description || course.short_description}</p>
          </div>
          <Card className="glass-card border-white/10">
            <CardContent className="p-5 space-y-4">
              <div className="flex justify-between text-sm"><span className="text-gray-400">Progresso geral</span><span>{Number(enrollment.progress_percent).toFixed(1)}%</span></div>
              <Progress value={Number(enrollment.progress_percent)} />
              {firstPending && <Button className="w-full" onClick={() => navigate(`/aula/${firstPending.id}`)}>{enrollment.status === "completed" ? "Revisar curso" : "Continuar de onde parou"}</Button>}
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Conteúdo do curso</h2>
          {course.course_modules.map((module: any, moduleIndex: number) => {
            const availableAt = new Date(enrollment.enrolled_at);
            availableAt.setDate(availableAt.getDate() + Number(module.release_after_days || 0));
            const locked = availableAt > new Date();
            return (
              <Card key={module.id} className="glass-card border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center justify-between gap-3">
                    <span>Módulo {moduleIndex + 1}: {module.title}</span>
                    {locked && <span className="text-xs font-normal text-gray-400 flex items-center gap-1"><LockKeyhole className="w-3.5 h-3.5" />Libera em {availableAt.toLocaleDateString("pt-BR")}</span>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {module.description && <p className="text-sm text-gray-400 mb-4">{module.description}</p>}
                  {module.lessons.map((lesson: any, lessonIndex: number) => {
                    const completed = Boolean(lesson.progress?.completed);
                    return (
                      <button
                        type="button"
                        key={lesson.id}
                        disabled={locked}
                        onClick={() => navigate(`/aula/${lesson.id}`)}
                        className="w-full rounded-lg border border-white/10 p-4 flex items-center gap-4 text-left hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {locked ? <LockKeyhole className="w-5 h-5 text-gray-500" /> : completed ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <Circle className="w-5 h-5 text-gray-500" />}
                        <div className="flex-1 min-w-0"><p className="font-medium">{moduleIndex + 1}.{lessonIndex + 1} {lesson.title}</p><p className="text-sm text-gray-500 line-clamp-1">{lesson.description || (lesson.content_type === "video" ? "Aula em vídeo" : lesson.content_type === "audio" ? "Aula em áudio" : "Aula em texto")}</p></div>
                        <span className="text-xs text-gray-500 flex items-center gap-1"><Clock3 className="w-3.5 h-3.5" />{Math.ceil(Number(lesson.duration_seconds || 0) / 60)} min</span>
                      </button>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </section>
      </main>
    </div>
  );
}

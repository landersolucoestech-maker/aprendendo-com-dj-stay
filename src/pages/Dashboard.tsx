import { useNavigate } from "react-router-dom";
import { Award, BookOpen, Clock3, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import PortalHeader from "@/components/portal/PortalHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useMyEnrollments } from "@/hooks/useStudentData";
import { formatDate } from "@/lib/platform";

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { data: enrollments, isLoading, error } = useMyEnrollments();
  const active = enrollments?.filter((entry) => entry.status === "active") ?? [];
  const completed = enrollments?.filter((entry) => entry.status === "completed") ?? [];
  const averageProgress = enrollments?.length
    ? enrollments.reduce((sum, entry) => sum + Number(entry.progress_percent), 0) / enrollments.length
    : 0;

  return (
    <div className="min-h-screen bg-black text-white">
      <PortalHeader />
      <main className="container mx-auto px-4 py-8 space-y-8">
        <section className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className="text-gray-400">Bem-vindo de volta,</p>
            <h1 className="text-3xl md:text-4xl font-bold gradient-text">{profile?.full_name || "Aluno"}</h1>
          </div>
          <Button onClick={() => navigate("/catalogo")}>Explorar novos cursos</Button>
        </section>

        <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card className="glass-card border-white/10"><CardContent className="p-5"><BookOpen className="w-5 h-5 mb-3" /><p className="text-sm text-gray-400">Cursos ativos</p><p className="text-2xl font-bold">{active.length}</p></CardContent></Card>
          <Card className="glass-card border-white/10"><CardContent className="p-5"><Award className="w-5 h-5 mb-3" /><p className="text-sm text-gray-400">Cursos concluídos</p><p className="text-2xl font-bold">{completed.length}</p></CardContent></Card>
          <Card className="glass-card border-white/10"><CardContent className="p-5"><GraduationCap className="w-5 h-5 mb-3" /><p className="text-sm text-gray-400">Progresso médio</p><p className="text-2xl font-bold">{averageProgress.toFixed(1)}%</p></CardContent></Card>
          <Card className="glass-card border-white/10"><CardContent className="p-5"><Clock3 className="w-5 h-5 mb-3" /><p className="text-sm text-gray-400">Último acesso</p><p className="text-sm font-medium mt-2">{formatDate(enrollments?.[0]?.last_accessed_at)}</p></CardContent></Card>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between"><h2 className="text-2xl font-bold">Continuar aprendendo</h2><Button variant="ghost" onClick={() => navigate("/meus-cursos")}>Ver todos</Button></div>
          {isLoading && <p className="text-gray-400">Carregando seus cursos...</p>}
          {error && <p className="text-red-400">{error.message}</p>}
          {!isLoading && !enrollments?.length && (
            <Card className="glass-card border-white/10"><CardContent className="p-10 text-center"><BookOpen className="w-10 h-10 mx-auto text-gray-500 mb-3" /><h3 className="text-lg font-semibold">Você ainda não possui cursos</h3><p className="text-gray-400 mt-1 mb-4">Escolha um curso no catálogo para iniciar.</p><Button onClick={() => navigate("/catalogo")}>Abrir catálogo</Button></CardContent></Card>
          )}
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {enrollments?.slice(0, 6).map((enrollment) => (
              <Card key={enrollment.id} className="glass-card border-white/10 overflow-hidden">
                {enrollment.courses.cover_image_path && <div className="aspect-video bg-cover bg-center" style={{ backgroundImage: `url(${enrollment.courses.cover_image_path})` }} />}
                <CardHeader><CardTitle className="text-white text-lg">{enrollment.courses.title}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-400 line-clamp-2">{enrollment.courses.short_description || "Curso disponível para acesso."}</p>
                  <div className="space-y-2"><div className="flex justify-between text-sm"><span className="text-gray-400">Progresso</span><span>{Number(enrollment.progress_percent).toFixed(1)}%</span></div><Progress value={Number(enrollment.progress_percent)} /></div>
                  <Button className="w-full" onClick={() => navigate(`/curso/${enrollment.course_id}`)}>Continuar curso</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

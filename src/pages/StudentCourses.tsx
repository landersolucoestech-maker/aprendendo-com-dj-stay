import { useNavigate } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import PortalHeader from "@/components/portal/PortalHeader";
import { useMyEnrollments } from "@/hooks/useStudentData";

export default function StudentCourses() {
  const navigate = useNavigate();
  const { data: enrollments, isLoading, error } = useMyEnrollments();

  return (
    <div className="min-h-screen bg-black text-white">
      <PortalHeader />
      <main className="container mx-auto px-4 py-8 space-y-6">
        <div><p className="text-sm text-gray-400">Área do aluno</p><h1 className="text-3xl font-bold gradient-text">Meus cursos</h1></div>
        {isLoading && <p className="text-gray-400">Carregando cursos...</p>}
        {error && <p className="text-red-400">{error.message}</p>}
        {!isLoading && !enrollments?.length && <Card className="glass-card border-white/10"><CardContent className="p-10 text-center"><BookOpen className="w-10 h-10 mx-auto text-gray-500 mb-3" /><p className="mb-4">Nenhum curso liberado para sua conta.</p><Button onClick={() => navigate("/catalogo")}>Ver catálogo</Button></CardContent></Card>}
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {enrollments?.map((enrollment) => (
            <Card key={enrollment.id} className="glass-card border-white/10">
              <CardHeader><CardTitle className="text-white">{enrollment.courses.title}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-400 line-clamp-3">{enrollment.courses.short_description || "Conteúdo disponível para acesso."}</p>
                <div className="space-y-2"><div className="flex justify-between text-sm"><span>Progresso</span><span>{Number(enrollment.progress_percent).toFixed(1)}%</span></div><Progress value={Number(enrollment.progress_percent)} /></div>
                <div className="flex items-center justify-between text-xs text-gray-500"><span>{enrollment.status}</span><span>{Math.round(enrollment.courses.workload_minutes / 60)}h estimadas</span></div>
                <Button className="w-full" onClick={() => navigate(`/curso/${enrollment.course_id}`)}>{enrollment.status === "completed" ? "Revisar curso" : "Continuar"}</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}

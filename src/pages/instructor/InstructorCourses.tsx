import { FormEvent, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BookOpen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateCourse, useInstructorCourses } from "@/hooks/useInstructorData";
import { formatDate } from "@/lib/platform";
import { useToast } from "@/hooks/use-toast";

export default function InstructorCourses() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: courses, isLoading, error } = useInstructorCourses();
  const createCourse = useCreateCourse();
  const [showForm, setShowForm] = useState(location.pathname.endsWith("/novo"));
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Produção Musical");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user || !title.trim()) return;
    try {
      const created = await createCourse.mutateAsync({
        title,
        short_description: description,
        category,
        created_by: user.id,
      });
      toast({ title: "Curso criado", description: "O curso foi criado como rascunho." });
      navigate(`/instrutor/cursos/${created.id}`);
    } catch (creationError) {
      toast({ title: "Erro", description: creationError instanceof Error ? creationError.message : "Não foi possível criar o curso.", variant: "destructive" });
    }
  };

  const closeForm = () => {
    setShowForm(false);
    if (location.pathname.endsWith("/novo")) navigate("/instrutor/cursos", { replace: true });
  };

  return (
    <div className="p-5 md:p-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div><p className="text-sm text-gray-400">CMS</p><h1 className="text-3xl font-bold gradient-text">Cursos</h1></div>
        <Button onClick={() => setShowForm((value) => !value)}><Plus className="w-4 h-4 mr-2" />Novo curso</Button>
      </div>

      {showForm && (
        <Card className="glass-card border-white/10">
          <CardHeader><CardTitle className="text-white">Criar curso</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={submit} className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label htmlFor="course-title">Título</Label><Input id="course-title" value={title} onChange={(event) => setTitle(event.target.value)} required /></div>
              <div className="space-y-2"><Label htmlFor="course-category">Categoria</Label><Input id="course-category" value={category} onChange={(event) => setCategory(event.target.value)} /></div>
              <div className="space-y-2 md:col-span-2"><Label htmlFor="course-description">Descrição curta</Label><Textarea id="course-description" value={description} onChange={(event) => setDescription(event.target.value)} /></div>
              <div className="md:col-span-2 flex justify-end gap-2"><Button type="button" variant="ghost" onClick={closeForm}>Cancelar</Button><Button type="submit" disabled={createCourse.isPending}>{createCourse.isPending ? "Criando..." : "Criar curso"}</Button></div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading && <p className="text-gray-400">Carregando cursos...</p>}
      {error && <p className="text-red-400">{error.message}</p>}
      {!isLoading && !courses?.length && <Card className="glass-card border-white/10"><CardContent className="p-10 text-center"><BookOpen className="w-10 h-10 mx-auto mb-3 text-gray-500" /><p>Nenhum curso encontrado.</p></CardContent></Card>}

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {courses?.map((course) => (
          <Card key={course.id} className="glass-card border-white/10">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold text-lg">{course.title}</h2><p className="text-sm text-gray-400 mt-1 line-clamp-2">{course.short_description || "Sem descrição"}</p></div><span className="text-xs rounded-full bg-white/10 px-2 py-1">{course.status}</span></div>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-400"><span>{course.course_modules?.[0]?.count ?? 0} módulos</span><span>{course.category || "Sem categoria"}</span><span className="col-span-2">Atualizado em {formatDate(course.updated_at)}</span></div>
              <Button className="w-full" variant="outline" onClick={() => navigate(`/instrutor/cursos/${course.id}`)}>Editar conteúdo</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

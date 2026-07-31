import { Archive, Copy, Eye, FilePlus2, ListTree, Pencil, Send, Trash2, Undo2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { AdminCourseLayout } from "@/components/admin/AdminCourseLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { CourseCmsRow } from "@/contracts/course-cms";
import { useAdminCourses, useCourseCmsMutations } from "@/hooks/useCourseCms";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/error-message";

const statusLabel: Record<CourseCmsRow["status"], string> = {
  draft: "Rascunho",
  published: "Publicado",
  archived: "Arquivado",
};

const formatMoney = (course: CourseCmsRow) => new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: course.currency_code,
}).format(course.promotional_price_amount ?? course.price_amount);

const CoursesAdmin = () => {
  const navigate = useNavigate();
  const coursesQuery = useAdminCourses();
  const mutations = useCourseCmsMutations();
  const { toast } = useToast();

  const run = async (action: () => Promise<CourseCmsRow>, success: string) => {
    try {
      await action();
      toast({ title: success });
    } catch (error: unknown) {
      toast({ title: "Operação não concluída", description: getErrorMessage(error), variant: "destructive" });
    }
  };

  const duplicate = async (course: CourseCmsRow) => {
    const suffix = crypto.randomUUID().slice(0, 8);
    await run(
      () => mutations.duplicate.mutateAsync({ courseId: course.id, title: `${course.title} — Cópia`, slug: `${course.slug}-copia-${suffix}` }),
      "Curso duplicado como rascunho.",
    );
  };

  if (coursesQuery.isLoading) {
    return <div className="min-h-screen bg-black text-white grid place-items-center">Carregando cursos...</div>;
  }
  if (coursesQuery.error) {
    return <div className="min-h-screen bg-black text-white grid place-items-center">{getErrorMessage(coursesQuery.error)}</div>;
  }

  const courses = coursesQuery.data ?? [];

  return (
    <AdminCourseLayout
      title="Cursos"
      description="Gerencie o ciclo editorial, os metadados pedagógicos, os preços, a disponibilidade e a elegibilidade comercial."
      actions={<Button onClick={() => navigate("/admin/cursos/novo")} className="btn-neon"><FilePlus2 className="mr-2 h-4 w-4" /> Novo curso</Button>}
    >
      {courses.length === 0 ? (
        <Card className="border-white/10 bg-white/5 text-white">
          <CardHeader><CardTitle>Nenhum curso cadastrado</CardTitle><CardDescription>Crie o primeiro rascunho no CMS.</CardDescription></CardHeader>
        </Card>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {courses.map((course) => (
            <Card key={course.id} className="border-white/10 bg-white/5 text-white">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div><CardTitle>{course.title}</CardTitle><CardDescription className="mt-1">/{course.slug}</CardDescription></div>
                  <Badge variant="outline" className="border-purple-400/40 text-purple-200">{statusLabel[course.status]}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="min-h-10 text-sm text-gray-300">{course.short_description ?? "Descrição curta ainda não informada."}</p>
                <div className="grid grid-cols-2 gap-3 text-sm text-gray-400 md:grid-cols-4">
                  <span>{course.category ?? "Sem categoria"}</span><span>{course.language_code}</span><span>{formatMoney(course)}</span><span>v{course.version}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => navigate(`/admin/cursos/${course.id}/editar`)}><Pencil className="mr-2 h-4 w-4" /> Editar</Button>
                  <Button size="sm" variant="outline" onClick={() => navigate(`/admin/cursos/${course.id}/preview`)}><Eye className="mr-2 h-4 w-4" /> Preview</Button>
                  <Button size="sm" variant="outline" onClick={() => navigate(`/admin/cursos/${course.id}/curriculo`)}><ListTree className="mr-2 h-4 w-4" /> Currículo</Button>
                  <Button size="sm" variant="outline" onClick={() => duplicate(course)}><Copy className="mr-2 h-4 w-4" /> Duplicar</Button>
                  {course.status === "draft" && <Button size="sm" variant="outline" onClick={() => run(() => mutations.publish.mutateAsync(course), "Curso publicado.")}><Send className="mr-2 h-4 w-4" /> Publicar</Button>}
                  {course.status === "published" && <Button size="sm" variant="outline" onClick={() => run(() => mutations.unpublish.mutateAsync(course), "Curso despublicado.")}><Undo2 className="mr-2 h-4 w-4" /> Despublicar</Button>}
                  {course.status !== "archived" && <Button size="sm" variant="outline" onClick={() => run(() => mutations.archive.mutateAsync(course), "Curso arquivado.")}><Archive className="mr-2 h-4 w-4" /> Arquivar</Button>}
                  <Button size="sm" variant="destructive" onClick={() => run(() => mutations.remove.mutateAsync(course), "Curso excluído de forma controlada.")}><Trash2 className="mr-2 h-4 w-4" /> Excluir</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AdminCourseLayout>
  );
};

export default CoursesAdmin;

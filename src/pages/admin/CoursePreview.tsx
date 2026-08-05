import { ArrowLeft, Award, CalendarClock, CheckCircle2, Languages, Users } from "lucide-react";
import { useNavigate, useParams } from "react-router";

import { AdminCourseLayout } from "@/components/admin/AdminCourseLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminCourse } from "@/hooks/useCourseCms";
import { useCourseAssetUrl } from "@/hooks/useCourseAssetUrl";
import { getErrorMessage } from "@/lib/error-message";

const CoursePreview = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const courseQuery = useAdminCourse(courseId);
  const coverQuery = useCourseAssetUrl(courseQuery.data?.cover_asset_id ?? null);
  const thumbnailQuery = useCourseAssetUrl(courseQuery.data?.thumbnail_asset_id ?? null);

  if (courseQuery.isLoading) return <div className="min-h-screen bg-black text-white grid place-items-center">Preparando preview...</div>;
  if (courseQuery.error || !courseQuery.data) return <div className="min-h-screen bg-black text-white grid place-items-center">{getErrorMessage(courseQuery.error, "Curso não encontrado.")}</div>;
  const course = courseQuery.data;
  const effectivePrice = course.promotional_price_amount ?? course.price_amount;

  return (
    <AdminCourseLayout
      title={`Preview — ${course.title}`}
      description="Visualização administrativa dos dados persistidos, inclusive para rascunhos e cursos arquivados."
      actions={<Button variant="outline" onClick={() => navigate(`/admin/cursos/${course.id}/editar`)}><ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao editor</Button>}
    >
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
        {coverQuery.data ? <img src={coverQuery.data} alt={`Capa de ${course.title}`} className="h-72 w-full object-cover" /> : <div className="grid h-72 place-items-center bg-gray-900 text-gray-500">Capa não definida</div>}
        <div className="grid gap-8 p-6 lg:grid-cols-[1fr_280px] lg:p-10">
          <div>
            <div className="mb-4 flex flex-wrap gap-2"><Badge>{course.status}</Badge><Badge variant="outline">{course.category ?? "Sem categoria"}</Badge><Badge variant="outline">{course.level}</Badge></div>
            <h2 className="text-4xl font-bold">{course.title}</h2>
            <p className="mt-4 text-lg text-gray-300">{course.short_description ?? "Descrição curta não informada."}</p>
            <div className="prose prose-invert mt-8 max-w-none whitespace-pre-wrap">{course.description ?? "Descrição completa não informada."}</div>
            <section className="mt-10"><h3 className="text-2xl font-semibold">Objetivos</h3><ul className="mt-4 space-y-2">{course.objectives.map((item) => <li key={item} className="flex gap-2"><CheckCircle2 className="mt-1 h-4 w-4 text-purple-300" /> {item}</li>)}</ul></section>
            <section className="mt-10"><h3 className="text-2xl font-semibold">Pré-requisitos</h3>{course.prerequisites.length === 0 ? <p className="mt-3 text-gray-400">Nenhum pré-requisito informado.</p> : <ul className="mt-4 list-disc space-y-2 pl-5">{course.prerequisites.map((item) => <li key={item}>{item}</li>)}</ul>}</section>
          </div>
          <aside className="space-y-5">
            <Card className="border-white/10 bg-black/30 text-white">
              <CardHeader>{thumbnailQuery.data ? <img src={thumbnailQuery.data} alt="Thumbnail" className="aspect-video rounded-lg object-cover" /> : null}<CardTitle className="text-3xl">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: course.currency_code }).format(effectivePrice)}</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm text-gray-300">
                <p className="flex gap-2"><Languages className="h-4 w-4" /> {course.language_code}</p>
                <p className="flex gap-2"><CalendarClock className="h-4 w-4" /> {course.access_duration_days ? `${course.access_duration_days} dias de acesso` : "Prazo não definido"}</p>
                <p className="flex gap-2"><Award className="h-4 w-4" /> {course.certificate_enabled ? `Certificado com ${course.certificate_min_completion_percent}%` : "Sem certificado"}</p>
                <p className="flex gap-2"><Users className="h-4 w-4" /> {course.affiliate_eligible ? "Elegível para afiliados" : "Não elegível para afiliados"}</p>
                <p>Liberação: {course.release_mode}</p><p>Conclusão: {course.completion_mode} ({course.completion_required_percent}%)</p><p>Versão editorial: {course.version}</p>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </AdminCourseLayout>
  );
};

export default CoursePreview;

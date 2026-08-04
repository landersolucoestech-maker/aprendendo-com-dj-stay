import { BookOpen } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";

import LessonGrid from "@/components/LessonGrid";
import ModuleProgress from "@/components/ModuleProgress";
import { StudentPortalPageFrame } from "@/components/student/StudentPortalPageFrame";
import { StudentSectionHeader } from "@/components/student/StudentPortalPrimitives";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageState } from "@/components/ui/page-state";
import { Progress } from "@/components/ui/progress";
import { useModules } from "@/hooks/useModules";
import {
  useProgressCalculation,
  type ModuleLessonWithProgress,
} from "@/hooks/useProgressCalculation";
import { useStudentCourseDetailAccess } from "@/hooks/useStudentCourseDetailAccess";
import { calculateOverallCourseProgress } from "@/lib/course-progress";
import { getErrorMessage } from "@/lib/error-message";

const StudentCoursePage = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const accessQuery = useStudentCourseDetailAccess(courseId);
  const activeEnrollment = accessQuery.data;
  const modulesQuery = useModules(
    courseId,
    courseId !== undefined && activeEnrollment !== null && activeEnrollment !== undefined,
  );
  const progressCalculation = useProgressCalculation(modulesQuery.data);

  if (accessQuery.isLoading) {
    return (
      <StudentPortalPageFrame>
        <PageState
          variant="loading"
          title="Validando matrícula"
          description="Confirmando o acesso ao curso solicitado."
        />
      </StudentPortalPageFrame>
    );
  }

  if (accessQuery.error) {
    return (
      <StudentPortalPageFrame>
        <PageState
          variant="error"
          title="Matrícula indisponível"
          description={getErrorMessage(
            accessQuery.error,
            "Não foi possível validar a matrícula.",
          )}
        />
      </StudentPortalPageFrame>
    );
  }

  if (!courseId || !activeEnrollment) {
    return (
      <StudentPortalPageFrame>
        <PageState
          variant="empty"
          icon={BookOpen}
          title="Curso indisponível"
          description="Não existe matrícula ativa para este curso na conta autenticada."
          action={
            <Button asChild variant="outline">
              <Link to="/aluno/cursos">Voltar aos cursos</Link>
            </Button>
          }
        />
      </StudentPortalPageFrame>
    );
  }

  if (
    modulesQuery.isLoading ||
    progressCalculation.isLoading ||
    progressCalculation.data === undefined
  ) {
    return (
      <StudentPortalPageFrame>
        <PageState
          variant="loading"
          title="Carregando conteúdo"
          description="Consultando módulos, aulas e progresso persistido."
        />
      </StudentPortalPageFrame>
    );
  }

  const error = modulesQuery.error ?? progressCalculation.error;
  if (error) {
    return (
      <StudentPortalPageFrame>
        <PageState
          variant="error"
          title="Conteúdo indisponível"
          description={getErrorMessage(
            error,
            "Não foi possível carregar o conteúdo do curso.",
          )}
        />
      </StudentPortalPageFrame>
    );
  }

  const modules = progressCalculation.data;
  const overallProgress = calculateOverallCourseProgress(modules);
  const handleLessonClick = (lesson: ModuleLessonWithProgress): void => {
    navigate(`/aula/${lesson.id}`);
  };

  return (
    <StudentPortalPageFrame>
      <div className="space-y-8">
        <StudentSectionHeader
          eyebrow="Curso matriculado"
          title={activeEnrollment.courses.title}
          description="Aulas publicadas e progresso calculado a partir dos registros persistidos."
          action={
            <Button asChild variant="outline">
              <Link to="/aluno/cursos">Voltar aos cursos</Link>
            </Button>
          }
        />

        <Card variant="course" className="max-w-2xl">
          <CardContent className="p-5">
            <div className="mb-2 flex justify-between text-sm text-muted-foreground">
              <span>Progresso geral</span>
              <span>{overallProgress}%</span>
            </div>
            <Progress
              value={overallProgress}
              aria-label={`Progresso geral: ${overallProgress}%`}
            />
          </CardContent>
        </Card>

        {modules.length === 0 ? (
          <PageState
            variant="empty"
            icon={BookOpen}
            title="Conteúdo ainda não publicado"
            description="Não há módulos disponíveis para esta matrícula neste momento."
          />
        ) : (
          <div className="grid gap-8 xl:grid-cols-[1.5fr_1fr]">
            <LessonGrid modules={modules} onLessonClick={handleLessonClick} />
            <ModuleProgress modules={modules} />
          </div>
        )}
      </div>
    </StudentPortalPageFrame>
  );
};

export default StudentCoursePage;

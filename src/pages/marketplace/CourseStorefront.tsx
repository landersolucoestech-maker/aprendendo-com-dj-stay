import {
  BookOpen,
  CheckCircle2,
  Clock,
  CreditCard,
  GraduationCap,
  Loader2,
  ShoppingCart,
} from "lucide-react";
import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { AppPageShell } from "@/components/layout/AppPageShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageState } from "@/components/ui/page-state";
import type { PublicCourse } from "@/contracts/public-course-catalog";
import { useCourseCheckout } from "@/hooks/useCourseCheckout";
import { usePublicCourseCatalog } from "@/hooks/usePublicCourseCatalog";
import { getErrorMessage } from "@/lib/error-message";

const EMPTY_PUBLIC_COURSES: PublicCourse[] = [];

const levelLabel: Record<PublicCourse["level"], string> = {
  beginner: "Iniciante",
  intermediate: "Intermediário",
  advanced: "Avançado",
  all_levels: "Todos os níveis",
};

const formatCurrency = (amount: number, currencyCode: string): string =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currencyCode,
  }).format(amount);

const formatDuration = (minutes: number): string => {
  if (minutes <= 0) return "Duração em atualização";

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) return `${remainingMinutes} min`;
  if (remainingMinutes === 0) return `${hours} h`;
  return `${hours} h ${remainingMinutes} min`;
};

const CoursePurchaseCard = ({
  course,
  highlighted,
}: {
  course: PublicCourse;
  highlighted: boolean;
}) => {
  const checkoutMutation = useCourseCheckout();
  const alreadyEnrolled =
    checkoutMutation.data?.status === "already_enrolled";

  const startCheckout = async (): Promise<void> => {
    try {
      const result = await checkoutMutation.mutateAsync(course.slug);
      if (result.status === "checkout_created") {
        window.location.assign(result.checkoutUrl);
      }
    } catch {
      // A mutação preserva o erro validado para apresentação no card.
    }
  };

  return (
    <Card
      variant="course"
      className={highlighted ? "border-course ring-2 ring-course/20" : undefined}
    >
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="course">{course.category}</Badge>
              <Badge variant="outline">{levelLabel[course.level]}</Badge>
              {highlighted ? <Badge variant="secondary">Selecionado</Badge> : null}
            </div>
            <CardTitle className="mt-4">{course.title}</CardTitle>
            <CardDescription className="mt-2">
              {course.short_description}
            </CardDescription>
          </div>
          <div className="shrink-0 sm:text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Investimento
            </p>
            <p className="mt-1 text-3xl font-bold text-foreground">
              {formatCurrency(
                course.effective_price_amount,
                course.currency_code,
              )}
            </p>
            {course.promotion_active ? (
              <p className="mt-1 text-sm text-muted-foreground line-through">
                {formatCurrency(course.price_amount, course.currency_code)}
              </p>
            ) : null}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="surface-muted p-4">
            <BookOpen className="h-5 w-5 text-course" aria-hidden="true" />
            <p className="mt-2 font-semibold">{course.module_count} módulo(s)</p>
            <p className="text-xs text-muted-foreground">
              {course.lesson_count} aula(s) publicada(s)
            </p>
          </div>
          <div className="surface-muted p-4">
            <Clock className="h-5 w-5 text-course" aria-hidden="true" />
            <p className="mt-2 font-semibold">
              {formatDuration(course.duration_minutes)}
            </p>
            <p className="text-xs text-muted-foreground">Duração registrada</p>
          </div>
          <div className="surface-muted p-4">
            <GraduationCap className="h-5 w-5 text-course" aria-hidden="true" />
            <p className="mt-2 font-semibold">
              {course.certificate_enabled ? "Certificado habilitado" : "Sem certificado"}
            </p>
            <p className="text-xs text-muted-foreground">
              Conforme regras de conclusão
            </p>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold">Objetivos publicados</h3>
          <ul className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            {course.objectives.slice(0, 6).map((objective) => (
              <li key={objective} className="flex gap-2">
                <CheckCircle2
                  className="mt-0.5 h-4 w-4 shrink-0 text-course"
                  aria-hidden="true"
                />
                <span>{objective}</span>
              </li>
            ))}
          </ul>
        </div>

        {checkoutMutation.error ? (
          <PageState
            variant="error"
            compact
            title="Checkout indisponível"
            description={getErrorMessage(
              checkoutMutation.error,
              "Não foi possível preparar a compra deste curso.",
            )}
          />
        ) : null}

        {alreadyEnrolled ? (
          <div className="surface-muted space-y-3 p-4">
            <div className="flex items-center gap-2 font-semibold text-foreground">
              <CheckCircle2 className="h-5 w-5 text-course" aria-hidden="true" />
              Você já possui acesso ativo
            </div>
            <p className="text-sm text-muted-foreground">
              Nenhum novo checkout foi criado para evitar uma compra duplicada.
            </p>
            <Button asChild variant="context" className="w-full sm:w-auto">
              <Link to="/aluno/cursos">Abrir meus cursos</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Button
              type="button"
              variant="context"
              className="w-full sm:w-auto"
              disabled={checkoutMutation.isPending}
              onClick={() => void startCheckout()}
            >
              {checkoutMutation.isPending ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <CreditCard aria-hidden="true" />
              )}
              {checkoutMutation.isPending
                ? "Preparando checkout..."
                : "Comprar com Pix ou cartão"}
            </Button>
            <p className="text-xs leading-5 text-muted-foreground">
              O servidor valida novamente curso, preço, promoção, papel do usuário e
              matrícula antes de abrir o checkout hospedado.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const CourseStorefront = () => {
  const [searchParams] = useSearchParams();
  const requestedSlug = searchParams.get("curso");
  const catalogQuery = usePublicCourseCatalog();
  const courses = catalogQuery.data?.courses ?? EMPTY_PUBLIC_COURSES;
  const orderedCourses = useMemo(() => {
    if (!requestedSlug) return courses;

    return [...courses].sort((left, right) => {
      if (left.slug === requestedSlug) return -1;
      if (right.slug === requestedSlug) return 1;
      return 0;
    });
  }, [courses, requestedSlug]);
  const requestedCourseMissing =
    requestedSlug !== null &&
    !courses.some((course) => course.slug === requestedSlug);

  return (
    <AppPageShell
      context="course"
      eyebrow="Cursos"
      title="Comprar curso"
      description="Escolha uma oferta publicada e abra o checkout hospedado com preço validado pelo servidor."
      navigation={
        <span className="inline-flex items-center gap-2 text-sm font-medium text-course">
          <ShoppingCart className="h-4 w-4" aria-hidden="true" />
          Vitrine autenticada
        </span>
      }
      actions={
        <>
          <Button asChild variant="outline">
            <Link to="/portal">Voltar ao portal</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/marketplace">Produtos digitais</Link>
          </Button>
        </>
      }
    >
      {requestedCourseMissing ? (
        <PageState
          variant="empty"
          compact
          title="Curso solicitado não está disponível"
          description="A lista abaixo contém somente ofertas publicadas e liberadas para compra."
        />
      ) : null}

      {catalogQuery.isLoading ? (
        <PageState
          variant="loading"
          title="Carregando cursos"
          description="Consultando a oferta publicada no CMS."
        />
      ) : catalogQuery.error ? (
        <PageState
          variant="error"
          title="Cursos indisponíveis"
          description={getErrorMessage(
            catalogQuery.error,
            "Não foi possível carregar a vitrine de cursos.",
          )}
        />
      ) : orderedCourses.length === 0 ? (
        <PageState
          variant="empty"
          icon={BookOpen}
          title="Nenhum curso disponível"
          description="Somente cursos publicados e dentro da janela de disponibilidade aparecem aqui."
        />
      ) : (
        <section className="mt-6 grid gap-6" aria-label="Cursos disponíveis para compra">
          {orderedCourses.map((course) => (
            <CoursePurchaseCard
              key={course.slug}
              course={course}
              highlighted={course.slug === requestedSlug}
            />
          ))}
        </section>
      )}
    </AppPageShell>
  );
};

export default CourseStorefront;

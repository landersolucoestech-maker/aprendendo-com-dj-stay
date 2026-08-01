import { useMemo, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  Clock3,
  CreditCard,
  Download,
  FileText,
  GraduationCap,
  History,
  Library,
  Loader2,
  PackageCheck,
  PlayCircle,
  UserRound,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { getUserMetadataProfile } from "@/auth/user-metadata";
import { useAuth } from "@/auth/use-auth";
import LessonGrid from "@/components/LessonGrid";
import ModuleProgress from "@/components/ModuleProgress";
import {
  StudentSectionHeader,
  StudentStatCard,
} from "@/components/student/StudentPortalPrimitives";
import { StudentPortalShell } from "@/components/student/StudentPortalShell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageState } from "@/components/ui/page-state";
import { Progress } from "@/components/ui/progress";
import { getActiveEnrollments, useCourseAccess } from "@/hooks/useCourseAccess";
import { useModules } from "@/hooks/useModules";
import {
  useProgressCalculation,
  type ModuleLessonWithProgress,
} from "@/hooks/useProgressCalculation";
import { useRecentActivities } from "@/hooks/useRecentActivities";
import { useStudentLibrary } from "@/hooks/useStudentLibrary";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useUserProgress } from "@/hooks/useUserProgress";
import { useToast } from "@/hooks/use-toast";
import { formatAppDateTime } from "@/lib/date-time";
import { getErrorMessage } from "@/lib/error-message";
import { downloadPrivateAsset } from "@/lib/private-assets";

export type StudentPortalSection =
  | "dashboard"
  | "courses"
  | "course"
  | "library"
  | "orders"
  | "payments"
  | "profile"
  | "history";

interface StudentPortalProps {
  readonly section: StudentPortalSection;
}

const formatDateTime = (value: string | null): string =>
  formatAppDateTime(value, { fallback: "Não definido" });

const formatBytes = (value: number): string => {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

const materialLabel: Readonly<Record<string, string>> = {
  document: "Documento",
  sample: "Sample",
  preset: "Preset",
  stem: "Stem",
  project: "Projeto",
  archive: "Arquivo compactado",
  template: "Template",
  support_file: "Material de apoio",
};

const enrollmentStatusLabel: Readonly<Record<string, string>> = {
  pending: "Pendente",
  active: "Ativa",
  suspended: "Suspensa",
  revoked: "Revogada",
};

const enrollmentStatusVariant: Readonly<
  Record<string, BadgeProps["variant"]>
> = {
  pending: "warning",
  active: "success",
  suspended: "warning",
  revoked: "destructive",
};

const PortalDashboard = () => {
  const accessQuery = useCourseAccess();
  const progressQuery = useUserProgress();
  const activitiesQuery = useRecentActivities(5);
  const libraryQuery = useStudentLibrary();
  const profileQuery = useUserProfile();

  if (
    accessQuery.isLoading ||
    progressQuery.isLoading ||
    activitiesQuery.isLoading ||
    libraryQuery.isLoading ||
    profileQuery.isLoading
  ) {
    return (
      <PageState
        variant="loading"
        title="Carregando portal"
        description="Consultando matrículas, progresso, atividades e materiais liberados."
      />
    );
  }

  const error =
    accessQuery.error ??
    progressQuery.error ??
    activitiesQuery.error ??
    libraryQuery.error ??
    profileQuery.error;

  if (error) {
    return (
      <PageState
        variant="error"
        title="Não foi possível montar o painel"
        description={getErrorMessage(
          error,
          "Não foi possível montar o painel do aluno.",
        )}
      />
    );
  }

  const activeEnrollments = getActiveEnrollments(accessQuery.data ?? []);
  const progressRows = progressQuery.data ?? [];
  const averageProgress =
    progressRows.length === 0
      ? 0
      : Math.round(
          progressRows.reduce(
            (total, row) => total + row.progresso_percentual,
            0,
          ) / progressRows.length,
        );
  const completedLessons = progressRows.filter((row) => row.completada).length;
  const activities = activitiesQuery.data ?? [];
  const library = libraryQuery.data ?? [];

  return (
    <div className="space-y-8">
      <StudentSectionHeader
        eyebrow="Portal do Aluno"
        title="Visão geral"
        description="Acompanhe seus acessos, progresso, materiais e atividades reais."
      />

      <section
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        aria-label="Resumo acadêmico"
      >
        <StudentStatCard
          label="Cursos ativos"
          value={String(activeEnrollments.length)}
          description="Matrículas válidas neste momento"
          icon={GraduationCap}
        />
        <StudentStatCard
          label="Progresso médio"
          value={`${averageProgress}%`}
          description="Média das aulas iniciadas"
          icon={PlayCircle}
        />
        <StudentStatCard
          label="Aulas concluídas"
          value={String(completedLessons)}
          description="Conclusões persistidas no banco"
          icon={CheckCircle2}
        />
        <StudentStatCard
          label="Materiais liberados"
          value={String(library.length)}
          description="Arquivos privados com grant válido"
          icon={Library}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card variant="course">
          <CardHeader>
            <CardTitle>Continuar estudando</CardTitle>
            <CardDescription>
              Cursos associados às suas matrículas ativas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeEnrollments.length === 0 ? (
              <PageState
                variant="empty"
                compact
                icon={BookOpen}
                title="Nenhuma matrícula ativa"
                description="Os cursos aparecerão aqui quando houver uma matrícula válida."
              />
            ) : (
              activeEnrollments.slice(0, 3).map((enrollment) => (
                <article
                  key={enrollment.id}
                  className="surface-muted flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {enrollment.courses.title}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Acesso até {formatDateTime(enrollment.expires_at)}
                    </p>
                  </div>
                  <Button asChild variant="context" className="w-full sm:w-auto">
                    <Link to={`/aluno/cursos/${enrollment.course_id}`}>
                      Abrir curso
                    </Link>
                  </Button>
                </article>
              ))
            )}
          </CardContent>
        </Card>

        <Card variant="course">
          <CardHeader>
            <CardTitle>Atividades recentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {activities.length === 0 ? (
              <PageState
                variant="empty"
                compact
                icon={History}
                title="Nenhuma atividade registrada"
              />
            ) : (
              activities.map((activity) => (
                <article
                  key={activity.id}
                  className="border-b border-border pb-4 last:border-0"
                >
                  <p className="text-sm text-foreground">{activity.activity}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {activity.time}
                  </p>
                </article>
              ))
            )}
            <Button asChild variant="link">
              <Link to="/aluno/historico">Ver histórico completo</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const CoursesSection = () => {
  const accessQuery = useCourseAccess();

  if (accessQuery.isLoading) {
    return (
      <PageState
        variant="loading"
        title="Carregando matrículas"
        description="Validando cursos e períodos de acesso."
      />
    );
  }

  if (accessQuery.error) {
    return (
      <PageState
        variant="error"
        title="Cursos indisponíveis"
        description={getErrorMessage(
          accessQuery.error,
          "Não foi possível carregar seus cursos.",
        )}
      />
    );
  }

  const enrollments = accessQuery.data ?? [];

  return (
    <div className="space-y-6">
      <StudentSectionHeader
        title="Meus cursos"
        description="Matrículas ativas e histórico real de acessos."
      />

      {enrollments.length === 0 ? (
        <PageState
          variant="empty"
          icon={BookOpen}
          title="Nenhum curso encontrado"
          description="Os cursos aparecerão aqui somente após a criação de uma matrícula válida."
        />
      ) : (
        <section
          className="grid gap-5 lg:grid-cols-2"
          aria-label="Matrículas do aluno"
        >
          {enrollments.map((enrollment) => {
            const active = getActiveEnrollments([enrollment]).length === 1;
            return (
              <Card key={enrollment.id} variant="course">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle>{enrollment.courses.title}</CardTitle>
                      <CardDescription className="mt-2">
                        Matrícula{" "}
                        {enrollmentStatusLabel[enrollment.status] ??
                          enrollment.status}
                      </CardDescription>
                    </div>
                    <Badge variant={active ? "success" : enrollmentStatusVariant[enrollment.status] ?? "outline"}>
                      {active ? "Acesso ativo" : "Sem acesso atual"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <dl className="surface-muted grid gap-3 p-4 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-muted-foreground">Início</dt>
                      <dd className="mt-1 text-foreground">
                        {formatDateTime(enrollment.starts_at)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Validade</dt>
                      <dd className="mt-1 text-foreground">
                        {formatDateTime(enrollment.expires_at)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Origem</dt>
                      <dd className="mt-1 text-foreground">
                        {enrollment.source === "purchase"
                          ? "Compra"
                          : "Concessão manual"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">
                        Pagamento confirmado
                      </dt>
                      <dd className="mt-1 text-foreground">
                        {formatDateTime(enrollment.payment_confirmed_at)}
                      </dd>
                    </div>
                  </dl>

                  {enrollment.status_reason ? (
                    <div className="surface-muted p-3 text-sm text-muted-foreground">
                      {enrollment.status_reason}
                    </div>
                  ) : null}

                  {active ? (
                    <Button asChild variant="context" className="w-full">
                      <Link to={`/aluno/cursos/${enrollment.course_id}`}>
                        Acessar conteúdo
                      </Link>
                    </Button>
                  ) : (
                    <Button className="w-full" disabled>
                      Conteúdo indisponível
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </section>
      )}
    </div>
  );
};

const CourseSection = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const accessQuery = useCourseAccess();
  const activeEnrollment = getActiveEnrollments(accessQuery.data ?? []).find(
    (enrollment) => enrollment.course_id === courseId,
  );
  const modulesQuery = useModules(
    courseId,
    courseId !== undefined && activeEnrollment !== undefined,
  );
  const progressCalculation = useProgressCalculation(modulesQuery.data);

  if (accessQuery.isLoading) {
    return (
      <PageState
        variant="loading"
        title="Validando matrícula"
        description="Confirmando o acesso ao curso solicitado."
      />
    );
  }

  if (accessQuery.error) {
    return (
      <PageState
        variant="error"
        title="Matrícula indisponível"
        description={getErrorMessage(
          accessQuery.error,
          "Não foi possível validar a matrícula.",
        )}
      />
    );
  }

  if (!courseId || !activeEnrollment) {
    return (
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
    );
  }

  if (
    modulesQuery.isLoading ||
    progressCalculation.isLoading ||
    progressCalculation.data === undefined
  ) {
    return (
      <PageState
        variant="loading"
        title="Carregando conteúdo"
        description="Consultando módulos, aulas e progresso persistido."
      />
    );
  }

  const error = modulesQuery.error ?? progressCalculation.error;
  if (error) {
    return (
      <PageState
        variant="error"
        title="Conteúdo indisponível"
        description={getErrorMessage(
          error,
          "Não foi possível carregar o conteúdo do curso.",
        )}
      />
    );
  }

  const modules = progressCalculation.data;
  const overallProgress =
    modules.length === 0
      ? 0
      : Math.round(
          modules.reduce((total, module) => total + module.progress, 0) /
            modules.length,
        );
  const handleLessonClick = (lesson: ModuleLessonWithProgress) =>
    navigate(`/aula/${lesson.id}`);

  return (
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
          <Progress value={overallProgress} aria-label={`Progresso geral: ${overallProgress}%`} />
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
  );
};

const LibrarySection = () => {
  const libraryQuery = useStudentLibrary();
  const { toast } = useToast();
  const [downloadingAssetId, setDownloadingAssetId] = useState<string | null>(
    null,
  );

  if (libraryQuery.isLoading) {
    return (
      <PageState
        variant="loading"
        title="Carregando biblioteca"
        description="Validando materiais publicados e grants ativos."
      />
    );
  }

  if (libraryQuery.error) {
    return (
      <PageState
        variant="error"
        title="Biblioteca indisponível"
        description={getErrorMessage(
          libraryQuery.error,
          "Não foi possível carregar a biblioteca.",
        )}
      />
    );
  }

  const assets = libraryQuery.data ?? [];

  const handleDownload = async (assetId: string) => {
    const asset = assets.find((item) => item.id === assetId);
    if (!asset) return;

    setDownloadingAssetId(asset.id);
    try {
      await downloadPrivateAsset(asset);
      toast({ title: "Download iniciado", description: asset.original_name });
    } catch (error: unknown) {
      toast({
        title: "Não foi possível baixar o arquivo",
        description: getErrorMessage(
          error,
          "O material não pôde ser baixado.",
        ),
        variant: "destructive",
      });
    } finally {
      setDownloadingAssetId(null);
    }
  };

  return (
    <div className="space-y-6">
      <StudentSectionHeader
        title="Biblioteca"
        description="Materiais publicados e liberados para suas matrículas ativas."
      />

      {assets.length === 0 ? (
        <PageState
          variant="empty"
          icon={Library}
          title="Nenhum material liberado"
          description="A biblioteca exibe somente arquivos publicados com permissão válida para esta conta."
        />
      ) : (
        <section
          className="grid gap-4 lg:grid-cols-2"
          aria-label="Materiais liberados"
        >
          {assets.map((asset) => (
            <Card key={asset.id} variant="course">
              <CardContent className="flex items-center gap-4 p-5">
                <span className="rounded-xl bg-course/15 p-3 text-course">
                  <FileText className="h-6 w-6" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">
                    {asset.original_name}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {materialLabel[asset.purpose] ?? asset.purpose} ·{" "}
                    {formatBytes(asset.size_bytes)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Publicado em {formatDateTime(asset.published_at)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label={`Baixar ${asset.original_name}`}
                  disabled={downloadingAssetId === asset.id}
                  onClick={() => void handleDownload(asset.id)}
                >
                  {downloadingAssetId === asset.id ? (
                    <Loader2 className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Download aria-hidden="true" />
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
};

const FinancialEmptySection = ({
  type,
}: {
  readonly type: "orders" | "payments";
}) => {
  const orders = type === "orders";

  return (
    <div className="space-y-6">
      <StudentSectionHeader
        title={orders ? "Pedidos" : "Pagamentos"}
        description={
          orders
            ? "Histórico de pedidos persistidos pela plataforma."
            : "Histórico de cobranças e confirmações persistidas pela plataforma."
        }
      />
      <PageState
        variant="empty"
        icon={orders ? PackageCheck : CreditCard}
        title={orders ? "Nenhum pedido registrado" : "Nenhum pagamento registrado"}
        description={
          orders
            ? "Esta área não cria pedidos simulados. Registros aparecerão após a implantação do checkout real."
            : "Esta área não presume pagamento por redirecionamento. Somente confirmações reais e auditadas serão exibidas."
        }
      />
    </div>
  );
};

const ProfileSection = () => {
  const { user } = useAuth();
  const profileQuery = useUserProfile();
  const metadata = useMemo(() => {
    if (!user) return null;
    try {
      return getUserMetadataProfile(user);
    } catch {
      return null;
    }
  }, [user]);

  if (profileQuery.isLoading || !user) {
    return (
      <PageState
        variant="loading"
        title="Carregando perfil"
        description="Consultando dados da conta e avatar privado."
      />
    );
  }

  if (profileQuery.error) {
    return (
      <PageState
        variant="error"
        title="Perfil indisponível"
        description={getErrorMessage(
          profileQuery.error,
          "Não foi possível carregar o perfil.",
        )}
      />
    );
  }

  return (
    <div className="space-y-6">
      <StudentSectionHeader
        title="Perfil"
        description="Dados da conta autenticada e avatar privado."
      />

      <Card variant="course">
        <CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
          <Avatar className="h-24 w-24 border border-course/30">
            {profileQuery.data?.avatarSignedUrl ? (
              <AvatarImage
                src={profileQuery.data.avatarSignedUrl}
                alt="Avatar do aluno"
              />
            ) : null}
            <AvatarFallback>
              <UserRound className="h-10 w-10" aria-hidden="true" />
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-semibold text-foreground">
              {metadata?.fullName ?? "Nome não informado"}
            </h2>
            <p className="mt-1 text-muted-foreground">
              {user.email ?? "Email não informado"}
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Conta criada em {formatDateTime(user.created_at)}
            </p>
          </div>
          <Button asChild variant="context" className="w-full sm:w-auto">
            <Link to="/editar-perfil">Editar perfil</Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card variant="course">
          <CardHeader>
            <CardTitle>Contato</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Telefone</dt>
                <dd className="mt-1 text-foreground">
                  {metadata?.phone || "Não informado"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Website</dt>
                <dd className="mt-1 break-all text-foreground">
                  {metadata?.website || "Não informado"}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
        <Card variant="course">
          <CardHeader>
            <CardTitle>Biografia</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-6 text-muted-foreground">
            {metadata?.bio || "Nenhuma biografia informada."}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const HistorySection = () => {
  const activitiesQuery = useRecentActivities(100);

  if (activitiesQuery.isLoading) {
    return (
      <PageState
        variant="loading"
        title="Carregando histórico"
        description="Consultando atividades de progresso persistidas."
      />
    );
  }

  if (activitiesQuery.error) {
    return (
      <PageState
        variant="error"
        title="Histórico indisponível"
        description={getErrorMessage(
          activitiesQuery.error,
          "Não foi possível carregar o histórico.",
        )}
      />
    );
  }

  const activities = activitiesQuery.data ?? [];

  return (
    <div className="space-y-6">
      <StudentSectionHeader
        title="Histórico"
        description="Últimas atividades de progresso persistidas."
      />

      {activities.length === 0 ? (
        <PageState
          variant="empty"
          icon={History}
          title="Nenhuma atividade registrada"
          description="O histórico será preenchido quando você iniciar ou concluir aulas."
        />
      ) : (
        <Card variant="course">
          <CardContent className="divide-y divide-border p-0">
            {activities.map((activity) => (
              <article key={activity.id} className="flex gap-4 p-5">
                <span className="mt-1">
                  {activity.completed ? (
                    <CheckCircle2
                      className="h-5 w-5 text-success"
                      aria-hidden="true"
                    />
                  ) : (
                    <Clock3
                      className="h-5 w-5 text-course"
                      aria-hidden="true"
                    />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-foreground">
                    {activity.lessonTitle}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {activity.moduleTitle}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>
                      {activity.completed
                        ? "Concluída"
                        : `${activity.progressPercent}% assistido`}
                    </span>
                    <span>{formatDateTime(activity.updatedAt)}</span>
                  </div>
                </div>
              </article>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const renderSection = (section: StudentPortalSection) => {
  switch (section) {
    case "dashboard":
      return <PortalDashboard />;
    case "courses":
      return <CoursesSection />;
    case "course":
      return <CourseSection />;
    case "library":
      return <LibrarySection />;
    case "orders":
      return <FinancialEmptySection type="orders" />;
    case "payments":
      return <FinancialEmptySection type="payments" />;
    case "profile":
      return <ProfileSection />;
    case "history":
      return <HistorySection />;
  }
};

const StudentPortal = ({ section }: StudentPortalProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const displayName = useMemo(() => {
    if (!user) return "Aluno";
    try {
      return getUserMetadataProfile(user).fullName;
    } catch {
      return user.email ?? "Aluno";
    }
  }, [user]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      navigate("/", { replace: true });
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <StudentPortalShell
      displayName={displayName}
      email={user?.email ?? ""}
      isSigningOut={isSigningOut}
      onSignOut={() => void handleSignOut()}
    >
      {renderSection(section)}
    </StudentPortalShell>
  );
};

export default StudentPortal;

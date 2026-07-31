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
  LayoutDashboard,
  Library,
  Loader2,
  LogOut,
  PackageCheck,
  PlayCircle,
  ReceiptText,
  UserRound,
} from "lucide-react";
import { Link, NavLink, useNavigate, useParams } from "react-router-dom";

import { getUserMetadataProfile } from "@/auth/user-metadata";
import { useAuth } from "@/auth/use-auth";
import LessonGrid from "@/components/LessonGrid";
import ModuleProgress from "@/components/ModuleProgress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getActiveEnrollments, useCourseAccess } from "@/hooks/useCourseAccess";
import { useModules } from "@/hooks/useModules";
import { useProgressCalculation, type ModuleLessonWithProgress } from "@/hooks/useProgressCalculation";
import { useRecentActivities } from "@/hooks/useRecentActivities";
import { useStudentLibrary } from "@/hooks/useStudentLibrary";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useUserProgress } from "@/hooks/useUserProgress";
import { useToast } from "@/hooks/use-toast";
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
  section: StudentPortalSection;
}

const NAVIGATION = [
  { to: "/aluno", label: "Início", icon: LayoutDashboard, end: true },
  { to: "/aluno/cursos", label: "Meus cursos", icon: BookOpen, end: false },
  { to: "/aluno/biblioteca", label: "Biblioteca", icon: Library, end: false },
  { to: "/aluno/pedidos", label: "Pedidos", icon: ReceiptText, end: false },
  { to: "/aluno/pagamentos", label: "Pagamentos", icon: CreditCard, end: false },
  { to: "/aluno/historico", label: "Histórico", icon: History, end: false },
  { to: "/aluno/perfil", label: "Perfil", icon: UserRound, end: false },
] as const;

const formatDateTime = (value: string | null): string =>
  value === null
    ? "Não definido"
    : new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "America/Sao_Paulo",
      }).format(new Date(value));

const formatBytes = (value: number): string => {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

const materialLabel: Record<string, string> = {
  document: "Documento",
  sample: "Sample",
  preset: "Preset",
  stem: "Stem",
  project: "Projeto",
  archive: "Arquivo compactado",
  template: "Template",
  support_file: "Material de apoio",
};

const enrollmentStatusLabel: Record<string, string> = {
  pending: "Pendente",
  active: "Ativa",
  suspended: "Suspensa",
  revoked: "Revogada",
};

const LoadingState = ({ label = "Carregando portal..." }: { label?: string }) => (
  <div className="flex min-h-64 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
    <div className="text-center">
      <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin" />
      <p className="text-sm text-gray-300">{label}</p>
    </div>
  </div>
);

const ErrorState = ({ error, fallback }: { error: unknown; fallback: string }) => (
  <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-100">
    <p className="font-semibold">Não foi possível carregar esta área.</p>
    <p className="mt-2 text-sm text-red-200">{getErrorMessage(error, fallback)}</p>
  </div>
);

const EmptyState = ({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof BookOpen;
  title: string;
  description: string;
}) => (
  <Card className="border-white/10 bg-white/5">
    <CardContent className="flex flex-col items-center px-6 py-12 text-center">
      <Icon className="mb-4 h-10 w-10 text-gray-400" />
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <p className="mt-2 max-w-xl text-sm text-gray-400">{description}</p>
    </CardContent>
  </Card>
);

const StatCard = ({
  label,
  value,
  description,
  icon: Icon,
}: {
  label: string;
  value: string;
  description: string;
  icon: typeof BookOpen;
}) => (
  <Card className="border-white/10 bg-white/5">
    <CardContent className="flex items-start justify-between p-5">
      <div>
        <p className="text-sm text-gray-400">{label}</p>
        <p className="mt-1 text-3xl font-bold text-white">{value}</p>
        <p className="mt-2 text-xs text-gray-500">{description}</p>
      </div>
      <div className="rounded-xl bg-white/10 p-3">
        <Icon className="h-5 w-5 text-white" />
      </div>
    </CardContent>
  </Card>
);

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
    return <LoadingState />;
  }

  const error =
    accessQuery.error ??
    progressQuery.error ??
    activitiesQuery.error ??
    libraryQuery.error ??
    profileQuery.error;

  if (error) {
    return <ErrorState error={error} fallback="Não foi possível montar o painel do aluno." />;
  }

  const activeEnrollments = getActiveEnrollments(accessQuery.data ?? []);
  const progressRows = progressQuery.data ?? [];
  const averageProgress =
    progressRows.length === 0
      ? 0
      : Math.round(
          progressRows.reduce((total, row) => total + row.progresso_percentual, 0) /
            progressRows.length,
        );
  const completedLessons = progressRows.filter((row) => row.completada).length;
  const activities = activitiesQuery.data ?? [];
  const library = libraryQuery.data ?? [];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.25em] text-gray-400">Portal do Aluno</p>
        <h1 className="mt-2 text-3xl font-bold text-white">Visão geral</h1>
        <p className="mt-2 text-gray-400">
          Acompanhe seus acessos, progresso, materiais e atividades reais.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Cursos ativos"
          value={String(activeEnrollments.length)}
          description="Matrículas válidas neste momento"
          icon={GraduationCap}
        />
        <StatCard
          label="Progresso médio"
          value={`${averageProgress}%`}
          description="Média das aulas iniciadas"
          icon={PlayCircle}
        />
        <StatCard
          label="Aulas concluídas"
          value={String(completedLessons)}
          description="Conclusões persistidas no banco"
          icon={CheckCircle2}
        />
        <StatCard
          label="Materiais liberados"
          value={String(library.length)}
          description="Arquivos privados com grant válido"
          icon={Library}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle className="text-white">Continuar estudando</CardTitle>
            <CardDescription className="text-gray-400">
              Cursos associados às suas matrículas ativas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeEnrollments.length === 0 ? (
              <p className="rounded-xl border border-white/10 bg-black/20 p-5 text-sm text-gray-400">
                Nenhuma matrícula ativa foi encontrada.
              </p>
            ) : (
              activeEnrollments.slice(0, 3).map((enrollment) => (
                <div
                  key={enrollment.id}
                  className="flex flex-col gap-4 rounded-xl border border-white/10 bg-black/20 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-white">{enrollment.courses.title}</p>
                    <p className="mt-1 text-sm text-gray-400">
                      Acesso até {formatDateTime(enrollment.expires_at)}
                    </p>
                  </div>
                  <Link to={`/aluno/cursos/${enrollment.course_id}`}>
                    <Button className="btn-brand w-full sm:w-auto">Abrir curso</Button>
                  </Link>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle className="text-white">Atividades recentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {activities.length === 0 ? (
              <p className="text-sm text-gray-400">Nenhuma atividade registrada.</p>
            ) : (
              activities.map((activity) => (
                <div key={activity.id} className="border-b border-white/10 pb-4 last:border-0">
                  <p className="text-sm text-white">{activity.activity}</p>
                  <p className="mt-1 text-xs text-gray-500">{activity.time}</p>
                </div>
              ))
            )}
            <Link to="/aluno/historico" className="inline-flex text-sm font-medium text-white underline">
              Ver histórico completo
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const CoursesSection = () => {
  const accessQuery = useCourseAccess();

  if (accessQuery.isLoading) return <LoadingState label="Carregando matrículas..." />;
  if (accessQuery.error) {
    return <ErrorState error={accessQuery.error} fallback="Não foi possível carregar seus cursos." />;
  }

  const enrollments = accessQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Meus cursos</h1>
        <p className="mt-2 text-gray-400">Matrículas ativas e histórico de acessos.</p>
      </div>

      {enrollments.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Nenhum curso encontrado"
          description="Os cursos aparecerão aqui somente após a criação de uma matrícula válida."
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {enrollments.map((enrollment) => {
            const active = getActiveEnrollments([enrollment]).length === 1;
            return (
              <Card key={enrollment.id} className="border-white/10 bg-white/5">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-white">{enrollment.courses.title}</CardTitle>
                      <CardDescription className="mt-2 text-gray-400">
                        Matrícula {enrollmentStatusLabel[enrollment.status] ?? enrollment.status}
                      </CardDescription>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        active
                          ? "bg-green-500/15 text-green-300"
                          : "bg-white/10 text-gray-300"
                      }`}
                    >
                      {active ? "Acesso ativo" : "Sem acesso atual"}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 text-sm text-gray-400 sm:grid-cols-2">
                    <p>Início: {formatDateTime(enrollment.starts_at)}</p>
                    <p>Validade: {formatDateTime(enrollment.expires_at)}</p>
                    <p>Origem: {enrollment.source === "purchase" ? "Compra" : "Concessão manual"}</p>
                    <p>Pagamento confirmado: {formatDateTime(enrollment.payment_confirmed_at)}</p>
                  </div>
                  {enrollment.status_reason ? (
                    <p className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-gray-300">
                      {enrollment.status_reason}
                    </p>
                  ) : null}
                  {active ? (
                    <Link to={`/aluno/cursos/${enrollment.course_id}`}>
                      <Button className="btn-brand w-full">Acessar conteúdo</Button>
                    </Link>
                  ) : (
                    <Button className="w-full" disabled>
                      Conteúdo indisponível
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
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
  const modulesQuery = useModules(courseId, courseId !== undefined && activeEnrollment !== undefined);
  const progressCalculation = useProgressCalculation(modulesQuery.data);

  if (accessQuery.isLoading) return <LoadingState label="Validando matrícula..." />;
  if (accessQuery.error) {
    return <ErrorState error={accessQuery.error} fallback="Não foi possível validar a matrícula." />;
  }

  if (!courseId || !activeEnrollment) {
    return (
      <EmptyState
        icon={BookOpen}
        title="Curso indisponível"
        description="Não existe matrícula ativa para este curso na conta autenticada."
      />
    );
  }

  if (modulesQuery.isLoading || progressCalculation.isLoading || progressCalculation.data === undefined) {
    return <LoadingState label="Carregando conteúdo do curso..." />;
  }

  const error = modulesQuery.error ?? progressCalculation.error;
  if (error) {
    return <ErrorState error={error} fallback="Não foi possível carregar o conteúdo do curso." />;
  }

  const modules = progressCalculation.data;
  const overallProgress =
    modules.length === 0
      ? 0
      : Math.round(modules.reduce((total, module) => total + module.progress, 0) / modules.length);
  const handleLessonClick = (lesson: ModuleLessonWithProgress) => navigate(`/aula/${lesson.id}`);

  return (
    <div className="space-y-8">
      <div>
        <Link to="/aluno/cursos" className="text-sm text-gray-400 hover:text-white">
          ← Voltar aos cursos
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-white">{activeEnrollment.courses.title}</h1>
        <div className="mt-4 max-w-xl">
          <div className="mb-2 flex justify-between text-sm text-gray-400">
            <span>Progresso geral</span>
            <span>{overallProgress}%</span>
          </div>
          <Progress value={overallProgress} />
        </div>
      </div>

      {modules.length === 0 ? (
        <EmptyState
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
  const [downloadingAssetId, setDownloadingAssetId] = useState<string | null>(null);

  if (libraryQuery.isLoading) return <LoadingState label="Carregando biblioteca..." />;
  if (libraryQuery.error) {
    return <ErrorState error={libraryQuery.error} fallback="Não foi possível carregar a biblioteca." />;
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
        description: getErrorMessage(error, "O material não pôde ser baixado."),
        variant: "destructive",
      });
    } finally {
      setDownloadingAssetId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Biblioteca</h1>
        <p className="mt-2 text-gray-400">
          Materiais publicados e liberados para suas matrículas ativas.
        </p>
      </div>

      {assets.length === 0 ? (
        <EmptyState
          icon={Library}
          title="Nenhum material liberado"
          description="A biblioteca exibe somente arquivos publicados com permissão válida para esta conta."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {assets.map((asset) => (
            <Card key={asset.id} className="border-white/10 bg-white/5">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="rounded-xl bg-white/10 p-3">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-white">{asset.original_name}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    {materialLabel[asset.purpose] ?? asset.purpose} · {formatBytes(asset.size_bytes)}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
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
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

const FinancialEmptySection = ({ type }: { type: "orders" | "payments" }) => {
  const orders = type === "orders";
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">{orders ? "Pedidos" : "Pagamentos"}</h1>
        <p className="mt-2 text-gray-400">
          {orders
            ? "Histórico de pedidos persistidos pela plataforma."
            : "Histórico de cobranças e confirmações persistidas pela plataforma."}
        </p>
      </div>
      <EmptyState
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

  if (profileQuery.isLoading || !user) return <LoadingState label="Carregando perfil..." />;
  if (profileQuery.error) {
    return <ErrorState error={profileQuery.error} fallback="Não foi possível carregar o perfil." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Perfil</h1>
        <p className="mt-2 text-gray-400">Dados da conta autenticada e avatar privado.</p>
      </div>

      <Card className="border-white/10 bg-white/5">
        <CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
          <Avatar className="h-24 w-24">
            {profileQuery.data?.avatarSignedUrl ? (
              <AvatarImage src={profileQuery.data.avatarSignedUrl} alt="Avatar do aluno" />
            ) : null}
            <AvatarFallback>
              <UserRound className="h-10 w-10" />
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-semibold text-white">
              {metadata?.fullName ?? "Nome não informado"}
            </h2>
            <p className="mt-1 text-gray-400">{user.email ?? "Email não informado"}</p>
            <p className="mt-3 text-sm text-gray-500">
              Conta criada em {formatDateTime(user.created_at)}
            </p>
          </div>
          <Link to="/editar-perfil">
            <Button className="btn-brand w-full sm:w-auto">Editar perfil</Button>
          </Link>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-white/10 bg-white/5">
          <CardHeader><CardTitle className="text-white">Contato</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-300">
            <p>Telefone: {metadata?.phone || "Não informado"}</p>
            <p>Website: {metadata?.website || "Não informado"}</p>
          </CardContent>
        </Card>
        <Card className="border-white/10 bg-white/5">
          <CardHeader><CardTitle className="text-white">Biografia</CardTitle></CardHeader>
          <CardContent className="text-sm text-gray-300">
            {metadata?.bio || "Nenhuma biografia informada."}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const HistorySection = () => {
  const activitiesQuery = useRecentActivities(100);

  if (activitiesQuery.isLoading) return <LoadingState label="Carregando histórico..." />;
  if (activitiesQuery.error) {
    return <ErrorState error={activitiesQuery.error} fallback="Não foi possível carregar o histórico." />;
  }

  const activities = activitiesQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Histórico</h1>
        <p className="mt-2 text-gray-400">Últimas atividades de progresso persistidas.</p>
      </div>

      {activities.length === 0 ? (
        <EmptyState
          icon={History}
          title="Nenhuma atividade registrada"
          description="O histórico será preenchido quando você iniciar ou concluir aulas."
        />
      ) : (
        <Card className="border-white/10 bg-white/5">
          <CardContent className="divide-y divide-white/10 p-0">
            {activities.map((activity) => (
              <div key={activity.id} className="flex gap-4 p-5">
                <div className="mt-1">
                  {activity.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-green-400" />
                  ) : (
                    <Clock3 className="h-5 w-5 text-blue-300" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-white">{activity.lessonTitle}</p>
                  <p className="mt-1 text-sm text-gray-400">{activity.moduleTitle}</p>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                    <span>{activity.completed ? "Concluída" : `${activity.progressPercent}% assistido`}</span>
                    <span>{formatDateTime(activity.updatedAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const renderSection = (section: StudentPortalSection) => {
  switch (section) {
    case "dashboard": return <PortalDashboard />;
    case "courses": return <CoursesSection />;
    case "course": return <CourseSection />;
    case "library": return <LibrarySection />;
    case "orders": return <FinancialEmptySection type="orders" />;
    case "payments": return <FinancialEmptySection type="payments" />;
    case "profile": return <ProfileSection />;
    case "history": return <HistorySection />;
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
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="hidden w-72 shrink-0 border-r border-white/10 bg-white/[0.03] p-6 lg:flex lg:flex-col">
          <Link to="/aluno" className="flex items-center gap-3">
            <div className="rounded-xl bg-white p-2 text-black"><GraduationCap className="h-5 w-5" /></div>
            <div>
              <p className="font-bold">Aprendendo com DJ Stay</p>
              <p className="text-xs text-gray-500">Portal do Aluno</p>
            </div>
          </Link>

          <nav className="mt-10 space-y-2" aria-label="Navegação do Portal do Aluno">
            {NAVIGATION.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${
                    isActive ? "bg-white text-black" : "text-gray-300 hover:bg-white/10 hover:text-white"
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="truncate text-sm font-medium text-white">{displayName}</p>
            <p className="truncate text-xs text-gray-500">{user?.email ?? ""}</p>
            <Button
              type="button"
              variant="ghost"
              className="mt-3 w-full justify-start text-gray-300"
              disabled={isSigningOut}
              onClick={() => void handleSignOut()}
            >
              {isSigningOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
              Sair
            </Button>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b border-white/10 bg-black/90 px-4 py-4 backdrop-blur lg:px-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-gray-500">Olá,</p>
                <p className="truncate font-semibold text-white">{displayName}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="lg:hidden"
                disabled={isSigningOut}
                onClick={() => void handleSignOut()}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </Button>
            </div>
            <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:hidden" aria-label="Navegação móvel do Portal do Aluno">
              {NAVIGATION.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-xs ${
                      isActive ? "bg-white text-black" : "bg-white/5 text-gray-300"
                    }`
                  }
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </NavLink>
              ))}
            </nav>
          </header>

          <main className="px-4 py-8 lg:px-8 lg:py-10">{renderSection(section)}</main>
        </div>
      </div>
    </div>
  );
};

export default StudentPortal;

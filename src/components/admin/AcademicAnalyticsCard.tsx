import {
  BookOpenCheck,
  CalendarDays,
  GraduationCap,
  RefreshCw,
  TriangleAlert,
  UserRoundCheck,
  Users,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AcademicAdminAnalytics } from "@/contracts/academic-analytics";
import { useAcademicAdminAnalytics } from "@/hooks/useAcademicAnalytics";
import { formatAppDateTime } from "@/lib/date-time";
import { getErrorMessage } from "@/lib/error-message";

const RANGE_OPTIONS = [7, 30, 90, 365] as const;
const INACTIVITY_OPTIONS = [7, 14, 30, 60] as const;
type RangeDays = (typeof RANGE_OPTIONS)[number];
type InactivityDays = (typeof INACTIVITY_OPTIONS)[number];

type AcademicPeriod = {
  readonly days: RangeDays;
  readonly startAt: string;
  readonly endAt: string;
};

const createPeriod = (days: RangeDays): AcademicPeriod => {
  const end = new Date();
  return {
    days,
    startAt: new Date(end.getTime() - days * 86_400_000).toISOString(),
    endAt: end.toISOString(),
  };
};

const bucketLabels: Record<
  AcademicAdminAnalytics["progress_distribution"][number]["bucket"],
  string
> = {
  not_started: "Não iniciado",
  started_1_24: "1% a 24%",
  progress_25_49: "25% a 49%",
  progress_50_74: "50% a 74%",
  progress_75_99: "75% a 99%",
  completed_100: "100%",
};

export const AcademicAnalyticsCard = () => {
  const [period, setPeriod] = useState<AcademicPeriod>(() => createPeriod(30));
  const [inactiveDays, setInactiveDays] = useState<InactivityDays>(30);
  const analyticsQuery = useAcademicAdminAnalytics({
    startAt: period.startAt,
    endAt: period.endAt,
    inactiveDays,
  });

  if (analyticsQuery.isLoading) {
    return (
      <Card className="border-white/10 bg-white/5" aria-busy="true">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <GraduationCap className="h-5 w-5" aria-hidden="true" /> Desempenho acadêmico
          </CardTitle>
          <CardDescription className="text-gray-400">
            Consolidando matrículas, aulas publicadas e progresso persistido.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (analyticsQuery.error || !analyticsQuery.data) {
    return (
      <Card className="border-white/10 bg-white/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <TriangleAlert className="h-5 w-5" aria-hidden="true" /> Desempenho acadêmico
          </CardTitle>
          <CardDescription className="text-gray-400">
            {getErrorMessage(
              analyticsQuery.error,
              "Não foi possível consultar o analytics acadêmico.",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="outline"
            className="border-white/20 bg-transparent"
            onClick={() => setPeriod(createPeriod(period.days))}
          >
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" /> Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  const analytics = analyticsQuery.data;
  const maxBucket = Math.max(
    1,
    ...analytics.progress_distribution.map((bucket) => bucket.enrollment_count),
  );

  return (
    <Card className="border-white/10 bg-white/5" aria-live="polite">
      <CardHeader className="gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-white">
            <GraduationCap className="h-5 w-5" aria-hidden="true" /> Desempenho acadêmico
          </CardTitle>
          <CardDescription className="mt-2 max-w-3xl text-gray-400">
            Coorte definida pelo início da matrícula. “Sem atividade recente” identifica
            matrícula ativa, ainda não concluída, iniciada antes do limite e sem visualização
            de aula dentro do período configurado; não significa abandono.
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          {RANGE_OPTIONS.map((days) => (
            <Button
              key={days}
              type="button"
              size="sm"
              variant={period.days === days ? "default" : "outline"}
              className={period.days === days ? undefined : "border-white/20 bg-transparent"}
              onClick={() => setPeriod(createPeriod(days))}
            >
              {days} dias
            </Button>
          ))}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-white/20 bg-transparent"
            disabled={analyticsQuery.isFetching}
            onClick={() => setPeriod(createPeriod(period.days))}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${analyticsQuery.isFetching ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            Atualizar
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-7">
        <div className="flex flex-col gap-3 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            {formatAppDateTime(analytics.period.start_at)} até {formatAppDateTime(analytics.period.end_at)}
          </p>
          <label className="flex items-center gap-2">
            Sem atividade há
            <select
              className="rounded-md border border-white/15 bg-black/30 px-2 py-1 text-white"
              value={inactiveDays}
              onChange={(event) =>
                setInactiveDays(Number(event.target.value) as InactivityDays)
              }
            >
              {INACTIVITY_OPTIONS.map((days) => (
                <option key={days} value={days}>{days} dias</option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <Users className="h-4 w-4 text-blue-200" aria-hidden="true" />
            <p className="mt-3 text-xs uppercase tracking-wide text-gray-500">Matrículas iniciadas</p>
            <p className="mt-2 text-xl font-semibold text-white">{analytics.summary.enrollments_started}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <UserRoundCheck className="h-4 w-4 text-blue-200" aria-hidden="true" />
            <p className="mt-3 text-xs uppercase tracking-wide text-gray-500">Alunos únicos</p>
            <p className="mt-2 text-xl font-semibold text-white">{analytics.summary.unique_students}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <BookOpenCheck className="h-4 w-4 text-emerald-200" aria-hidden="true" />
            <p className="mt-3 text-xs uppercase tracking-wide text-gray-500">100% das aulas</p>
            <p className="mt-2 text-xl font-semibold text-white">{analytics.summary.completed_all_lessons}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <GraduationCap className="h-4 w-4 text-purple-200" aria-hidden="true" />
            <p className="mt-3 text-xs uppercase tracking-wide text-gray-500">Conclusão média</p>
            <p className="mt-2 text-xl font-semibold text-white">{analytics.summary.average_completion_percent}%</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <TriangleAlert className="h-4 w-4 text-amber-200" aria-hidden="true" />
            <p className="mt-3 text-xs uppercase tracking-wide text-gray-500">Sem atividade recente</p>
            <p className="mt-2 text-xl font-semibold text-white">{analytics.summary.active_without_recent_activity}</p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <section aria-labelledby="academic-progress-distribution">
            <h2 id="academic-progress-distribution" className="text-sm font-semibold text-white">
              Distribuição de progresso
            </h2>
            <div className="mt-3 space-y-3">
              {analytics.progress_distribution.map((bucket) => (
                <div key={bucket.bucket} className="grid grid-cols-[100px_minmax(0,1fr)_32px] items-center gap-3 text-xs">
                  <span className="text-gray-500">{bucketLabels[bucket.bucket]}</span>
                  <div className="h-2 overflow-hidden rounded-full bg-white/5" aria-hidden="true">
                    <div
                      className="h-full rounded-full bg-white/40"
                      style={{ width: `${Math.max(2, bucket.enrollment_count / maxBucket * 100)}%` }}
                    />
                  </div>
                  <span className="text-right text-gray-300">{bucket.enrollment_count}</span>
                </div>
              ))}
            </div>
          </section>

          <section aria-labelledby="academic-course-breakdown">
            <h2 id="academic-course-breakdown" className="text-sm font-semibold text-white">
              Resultado por curso
            </h2>
            {analytics.course_breakdown.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-white/10 p-4 text-sm text-gray-400">
                Nenhuma matrícula iniciou neste período.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {analytics.course_breakdown.map((course) => (
                  <div key={course.course_id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-medium text-white">{course.course_title}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {course.enrollments_started} matrícula(s) · {course.unique_students} aluno(s)
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-white">{course.average_completion_percent}% médio</p>
                    </div>
                    <p className="mt-3 text-xs text-gray-400">
                      100%: {course.completed_all_lessons} · Sem atividade recente: {course.active_without_recent_activity} · Certificados válidos: {course.valid_certificates}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <p className="text-xs text-gray-500">
          Estados atuais da coorte: {analytics.summary.active_enrollments} ativa(s), {analytics.summary.pending_enrollments} pendente(s), {analytics.summary.suspended_enrollments} suspensa(s) e {analytics.summary.revoked_enrollments} revogada(s). Certificados válidos: {analytics.summary.valid_certificates}.
        </p>
      </CardContent>
    </Card>
  );
};

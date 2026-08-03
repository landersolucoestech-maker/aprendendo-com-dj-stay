import {
  Activity,
  CheckCircle2,
  Clock3,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { CheckoutCronHealthStatus } from "@/contracts/checkout-cron-health";
import { useCheckoutCronHealth } from "@/hooks/useCheckoutCronHealth";
import { formatAppDateTime } from "@/lib/date-time";
import { getErrorMessage } from "@/lib/error-message";

const healthLabels: Record<CheckoutCronHealthStatus, string> = {
  healthy: "Saudável",
  degraded: "Com falhas recentes",
  running: "Executando",
  never_run: "Ainda não executado",
  inactive: "Inativo",
  missing: "Não configurado",
};

const formatDuration = (durationMs: number): string => {
  if (durationMs < 1000) return `${durationMs} ms`;
  return `${(durationMs / 1000).toFixed(2)} s`;
};

export const CheckoutCronHealthCard = () => {
  const cronHealthQuery = useCheckoutCronHealth(8);

  if (cronHealthQuery.isLoading) {
    return (
      <Card className="border-white/10 bg-white/5" aria-busy="true">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Activity className="h-5 w-5" aria-hidden="true" /> Automação de checkout
          </CardTitle>
          <CardDescription className="text-gray-400">
            Consultando o histórico persistido do Supabase Cron.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (cronHealthQuery.error || !cronHealthQuery.data) {
    return (
      <Card className="border-white/10 bg-white/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <TriangleAlert className="h-5 w-5" aria-hidden="true" /> Automação de checkout
          </CardTitle>
          <CardDescription className="text-gray-400">
            {getErrorMessage(
              cronHealthQuery.error,
              "Não foi possível consultar a saúde do job de expiração.",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="outline"
            className="border-white/20 bg-transparent"
            onClick={() => cronHealthQuery.refetch()}
          >
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" /> Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  const health = cronHealthQuery.data;
  const healthy = health.health === "healthy" || health.health === "running";

  return (
    <Card className="border-white/10 bg-white/5" aria-live="polite">
      <CardHeader className="gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-white">
            <Activity className="h-5 w-5" aria-hidden="true" /> Automação de checkout
          </CardTitle>
          <CardDescription className="mt-2 max-w-3xl text-gray-400">
            Saúde do job que encerra checkouts vencidos sem depender do retorno do navegador.
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-sm text-gray-200">
            {healthy ? (
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            ) : (
              <TriangleAlert className="h-4 w-4" aria-hidden="true" />
            )}
            {healthLabels[health.health]}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-white/20 bg-transparent"
            disabled={cronHealthQuery.isFetching}
            onClick={() => cronHealthQuery.refetch()}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${cronHealthQuery.isFetching ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Configuração</p>
            <p className="mt-2 font-semibold text-white">
              {health.configured && health.active ? "Ativo" : health.configured ? "Inativo" : "Ausente"}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Agenda</p>
            <p className="mt-2 font-semibold text-white">{health.schedule ?? "—"}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Última execução</p>
            <p className="mt-2 font-semibold text-white">
              {formatAppDateTime(health.last_run_at)}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Último sucesso</p>
            <p className="mt-2 font-semibold text-white">
              {formatAppDateTime(health.last_success_at)}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Falhas em 24h</p>
            <p className="mt-2 font-semibold text-white">{health.failed_runs_24h}</p>
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between gap-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
              <Clock3 className="h-4 w-4" aria-hidden="true" /> Execuções recentes
            </h2>
            <p className="text-xs text-gray-500">
              Observado em {formatAppDateTime(health.observed_at)}
            </p>
          </div>

          {health.runs.length === 0 ? (
            <p className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-gray-400">
              Nenhuma execução foi registrada para este job.
            </p>
          ) : (
            <div className="space-y-2">
              {health.runs.map((run, index) => (
                <div
                  key={`${run.started_at}-${index}`}
                  className="grid gap-2 rounded-xl border border-white/10 bg-black/20 p-4 text-sm md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center"
                >
                  <div>
                    <p className="font-medium text-white">{run.status}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {formatAppDateTime(run.started_at)}
                      {run.ended_at ? ` — ${formatAppDateTime(run.ended_at)}` : ""}
                    </p>
                    {run.message ? (
                      <p className="mt-2 break-words text-xs text-gray-400">{run.message}</p>
                    ) : null}
                  </div>
                  <span className="text-xs text-gray-400">{formatDuration(run.duration_ms)}</span>
                  <span className="text-xs text-gray-400">{run.ended_at ? "Finalizada" : "Em execução"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

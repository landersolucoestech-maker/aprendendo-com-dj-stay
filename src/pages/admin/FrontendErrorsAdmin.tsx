import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Eye,
  Loader2,
  RotateCcw,
  Search,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  FrontendErrorSource,
  FrontendErrorStatus,
} from "@/contracts/frontend-errors";
import {
  useFrontendErrorDashboard,
  useUpdateFrontendErrorStatus,
} from "@/hooks/useFrontendErrors";
import { useToast } from "@/hooks/use-toast";
import { formatAppDateTime } from "@/lib/date-time";
import { getErrorMessage } from "@/lib/error-message";

const fieldClass =
  "w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-white/40";

const statusLabel: Record<FrontendErrorStatus, string> = {
  open: "Aberto",
  acknowledged: "Reconhecido",
  resolved: "Resolvido",
  ignored: "Ignorado",
};

const sourceLabel: Record<FrontendErrorSource, string> = {
  route_boundary: "Limite de rota",
  window_error: "Erro global",
  unhandled_rejection: "Promise rejeitada",
};

const formatDateTime = (value: string | null): string =>
  formatAppDateTime(value, { fallback: "Não registrado" });

const FrontendErrorsAdmin = () => {
  const { toast } = useToast();
  const [status, setStatus] = useState<FrontendErrorStatus | null>(null);
  const [source, setSource] = useState<FrontendErrorSource | null>(null);
  const [route, setRoute] = useState("");
  const [note, setNote] = useState("");
  const dashboardQuery = useFrontendErrorDashboard(status, source, route);
  const updateStatus = useUpdateFrontendErrorStatus();
  const data = dashboardQuery.data;

  const changeStatus = async (
    frontendErrorId: string,
    nextStatus: FrontendErrorStatus,
  ) => {
    const requiresNote = nextStatus === "resolved" || nextStatus === "ignored";
    const normalizedNote = note.trim();

    if (requiresNote && normalizedNote.length < 3) {
      toast({
        title: "Nota obrigatória",
        description: "Informe a correção ou o motivo com pelo menos três caracteres.",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateStatus.mutateAsync({
        frontendErrorId,
        status: nextStatus,
        note: normalizedNote || null,
      });
      toast({
        title: `Incidente marcado como ${statusLabel[nextStatus].toLowerCase()}`,
      });
      setNote("");
    } catch (error: unknown) {
      toast({
        title: "Atualização não concluída",
        description: getErrorMessage(
          error,
          "Não foi possível atualizar o incidente.",
        ),
        variant: "destructive",
      });
    }
  };

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col gap-5 border-b border-white/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-gray-500">
              Administração
            </p>
            <h1 className="mt-3 flex items-center gap-3 text-4xl font-bold">
              <Activity className="h-9 w-9" />
              Erros do frontend
            </h1>
            <p className="mt-3 max-w-3xl text-gray-400">
              Fila persistente de falhas não tratadas capturadas para usuários
              autenticados. Rotas são normalizadas e e-mails, tokens e JWTs são
              removidos antes da persistência.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/admin/contatos">
              <Button variant="outline" className="border-white/20 bg-transparent">
                Contatos
              </Button>
            </Link>
            <Link to="/admin/cursos">
              <Button variant="outline" className="border-white/20 bg-transparent">
                Cursos
              </Button>
            </Link>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {(["open", "acknowledged", "resolved", "ignored"] as const).map(
            (item) => (
              <button
                key={item}
                type="button"
                onClick={() => setStatus(status === item ? null : item)}
                className="text-left"
              >
                <Card
                  className={`border-white/10 bg-white/5 transition ${
                    status === item
                      ? "ring-2 ring-violet-400"
                      : "hover:bg-white/10"
                  }`}
                >
                  <CardContent className="p-5">
                    <p className="text-sm text-gray-400">{statusLabel[item]}</p>
                    <p className="mt-1 text-3xl font-bold">
                      {data?.summary[item] ?? 0}
                    </p>
                  </CardContent>
                </Card>
              </button>
            ),
          )}
        </section>

        <Card className="border-white/10 bg-white/5">
          <CardContent className="grid gap-4 p-5 lg:grid-cols-3">
            <label className="relative block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                className={`${fieldClass} pl-10`}
                value={route}
                onChange={(event) => setRoute(event.target.value)}
                placeholder="Filtrar por rota"
                maxLength={500}
              />
            </label>
            <select
              className={fieldClass}
              value={source ?? ""}
              onChange={(event) =>
                setSource(
                  event.target.value
                    ? (event.target.value as FrontendErrorSource)
                    : null,
                )
              }
              aria-label="Filtrar por origem"
            >
              <option value="">Todas as origens</option>
              {(Object.keys(sourceLabel) as FrontendErrorSource[]).map((item) => (
                <option key={item} value={item}>
                  {sourceLabel[item]}
                </option>
              ))}
            </select>
            <input
              className={fieldClass}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Nota para reconhecimento ou resolução"
              maxLength={2000}
            />
          </CardContent>
        </Card>

        {dashboardQuery.isLoading ? (
          <div className="flex min-h-64 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : dashboardQuery.error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-100">
            {getErrorMessage(
              dashboardQuery.error,
              "Não foi possível carregar os incidentes.",
            )}
          </div>
        ) : (data?.events ?? []).length === 0 ? (
          <Card className="border-white/10 bg-white/5">
            <CardContent className="p-10 text-center text-gray-400">
              Nenhum incidente encontrado.
            </CardContent>
          </Card>
        ) : (
          <section className="space-y-4" aria-label="Incidentes do frontend">
            {(data?.events ?? []).map((event) => (
              <Card key={event.id} className="border-white/10 bg-white/5">
                <CardHeader>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-xl text-white">
                        <AlertTriangle className="h-5 w-5 text-amber-300" />
                        {event.error_name}
                      </CardTitle>
                      <CardDescription className="mt-2 text-gray-400">
                        {event.route} · {sourceLabel[event.source]} · release {event.release}
                      </CardDescription>
                    </div>
                    <span className="w-fit rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-gray-200">
                      {statusLabel[event.status]}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="whitespace-pre-wrap rounded-xl border border-white/10 bg-black/20 p-5 text-sm leading-6 text-gray-200">
                    {event.error_message}
                  </div>

                  {event.component_stack ? (
                    <details className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm">
                      <summary className="cursor-pointer font-semibold text-gray-300">
                        Pilha de componentes
                      </summary>
                      <pre className="mt-4 max-h-80 overflow-auto whitespace-pre-wrap text-xs text-gray-400">
                        {event.component_stack}
                      </pre>
                    </details>
                  ) : null}

                  <div className="grid gap-2 text-xs text-gray-500 sm:grid-cols-3">
                    <p>Ocorrido: {formatDateTime(event.occurred_at)}</p>
                    <p>Reconhecido: {formatDateTime(event.acknowledged_at)}</p>
                    <p>Encerrado: {formatDateTime(event.resolved_at)}</p>
                  </div>

                  {event.resolution_note ? (
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                      <strong>Nota:</strong> {event.resolution_note}
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    {event.status === "open" ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="border-white/20 bg-transparent"
                        disabled={updateStatus.isPending}
                        onClick={() =>
                          void changeStatus(event.id, "acknowledged")
                        }
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Reconhecer
                      </Button>
                    ) : null}
                    {event.status !== "resolved" ? (
                      <Button
                        type="button"
                        className="btn-brand"
                        disabled={updateStatus.isPending}
                        onClick={() => void changeStatus(event.id, "resolved")}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Resolver
                      </Button>
                    ) : null}
                    {event.status !== "ignored" ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="border-amber-500/30 bg-transparent text-amber-200"
                        disabled={updateStatus.isPending}
                        onClick={() => void changeStatus(event.id, "ignored")}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Ignorar
                      </Button>
                    ) : null}
                    {event.status !== "open" ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="border-white/20 bg-transparent"
                        disabled={updateStatus.isPending}
                        onClick={() => void changeStatus(event.id, "open")}
                      >
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Reabrir
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>
        )}
      </div>
    </main>
  );
};

export default FrontendErrorsAdmin;

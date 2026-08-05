import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Loader2,
  RotateCcw,
  Search,
  ShieldAlert,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ContactMessageStatus } from "@/contracts/contact-messages";
import { useContactMessagesAdmin, useUpdateContactMessageStatus } from "@/hooks/useContactMessages";
import { useToast } from "@/hooks/use-toast";
import { formatAppDateTime } from "@/lib/date-time";
import { getErrorMessage } from "@/lib/error-message";

const pageSize = 25;
const fieldClass =
  "w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-white/40";

const statusLabel: Record<ContactMessageStatus, string> = {
  new: "Nova",
  in_progress: "Em atendimento",
  resolved: "Resolvida",
  spam: "Spam",
};

const formatDateTime = (value: string | null): string =>
  formatAppDateTime(value, { fallback: "Não registrado" });

const ContactsAdmin = () => {
  const { toast } = useToast();
  const [status, setStatus] = useState<ContactMessageStatus | null>(null);
  const [search, setSearch] = useState("");
  const [note, setNote] = useState("");
  const [page, setPage] = useState(0);
  const dashboardQuery = useContactMessagesAdmin({
    status,
    search,
    limit: pageSize,
    offset: page * pageSize,
  });
  const updateStatus = useUpdateContactMessageStatus();
  const data = dashboardQuery.data;
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const changeStatus = async (
    contactMessageId: string,
    nextStatus: ContactMessageStatus,
  ) => {
    const requiresNote = nextStatus === "resolved" || nextStatus === "spam";
    if (requiresNote && note.trim().length < 3) {
      toast({
        title: "Motivo obrigatório",
        description: "Informe uma nota com pelo menos três caracteres.",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateStatus.mutateAsync({
        contactMessageId,
        status: nextStatus,
        note: requiresNote ? note.trim() : null,
      });
      toast({ title: `Solicitação marcada como ${statusLabel[nextStatus].toLowerCase()}` });
      setNote("");
    } catch (error: unknown) {
      toast({
        title: "Atualização não concluída",
        description: getErrorMessage(error, "Não foi possível atualizar a solicitação."),
        variant: "destructive",
      });
    }
  };

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col gap-5 border-b border-white/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-gray-500">Administração</p>
            <h1 className="mt-3 flex items-center gap-3 text-4xl font-bold">
              <Inbox className="h-9 w-9" />
              Solicitações de contato
            </h1>
            <p className="mt-3 max-w-3xl text-gray-400">
              Caixa persistente de solicitações. O sistema registra protocolo e tratamento, mas não afirma envio automático de resposta por e-mail ou mensageria externa.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/admin/erros">
              <Button variant="outline" className="border-white/20 bg-transparent">Erros</Button>
            </Link>
            <Link to="/admin/alunos">
              <Button variant="outline" className="border-white/20 bg-transparent">Alunos</Button>
            </Link>
            <Link to="/admin/cursos">
              <Button variant="outline" className="border-white/20 bg-transparent">Cursos</Button>
            </Link>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {(["new", "in_progress", "resolved", "spam"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setStatus(status === item ? null : item);
                setPage(0);
              }}
              className="text-left"
            >
              <Card className={`border-white/10 bg-white/5 transition ${status === item ? "ring-2 ring-violet-400" : "hover:bg-white/10"}`}>
                <CardContent className="p-5">
                  <p className="text-sm text-gray-400">{statusLabel[item]}</p>
                  <p className="mt-1 text-3xl font-bold">{data?.summary[item] ?? 0}</p>
                </CardContent>
              </Card>
            </button>
          ))}
        </section>

        <Card className="border-white/10 bg-white/5">
          <CardContent className="grid gap-4 p-5 lg:grid-cols-[1fr_1fr]">
            <label className="relative block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                className={`${fieldClass} pl-10`}
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(0);
                }}
                placeholder="Buscar protocolo, nome, e-mail ou assunto"
              />
            </label>
            <input
              className={fieldClass}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Nota obrigatória para resolver ou marcar como spam"
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
            {getErrorMessage(dashboardQuery.error, "Não foi possível carregar as solicitações.")}
          </div>
        ) : (data?.messages ?? []).length === 0 ? (
          <Card className="border-white/10 bg-white/5">
            <CardContent className="p-10 text-center text-gray-400">Nenhuma solicitação encontrada.</CardContent>
          </Card>
        ) : (
          <section className="space-y-4" aria-label="Solicitações registradas">
            {(data?.messages ?? []).map((message) => (
              <Card key={message.id} className="border-white/10 bg-white/5">
                <CardHeader>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <CardTitle className="text-xl text-white">{message.subject}</CardTitle>
                      <CardDescription className="mt-2 text-gray-400">
                        {message.reference_code} · {message.name} · {message.email}
                      </CardDescription>
                    </div>
                    <span className="w-fit rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-gray-200">
                      {statusLabel[message.status]}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="whitespace-pre-wrap rounded-xl border border-white/10 bg-black/20 p-5 text-sm leading-6 text-gray-200">
                    {message.message}
                  </div>
                  <div className="grid gap-2 text-xs text-gray-500 sm:grid-cols-3">
                    <p>Registrada: {formatDateTime(message.submitted_at)}</p>
                    <p>Tratada: {formatDateTime(message.handled_at)}</p>
                    <p>Eventos: {message.event_count}</p>
                  </div>
                  {message.resolution_note ? (
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                      <strong>Nota de tratamento:</strong> {message.resolution_note}
                    </div>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    {message.status !== "in_progress" ? (
                      <Button type="button" variant="outline" className="border-white/20 bg-transparent" disabled={updateStatus.isPending} onClick={() => void changeStatus(message.id, "in_progress")}>
                        Em atendimento
                      </Button>
                    ) : null}
                    {message.status !== "resolved" ? (
                      <Button type="button" className="btn-brand" disabled={updateStatus.isPending} onClick={() => void changeStatus(message.id, "resolved")}>
                        <CheckCircle2 className="mr-2 h-4 w-4" />Resolver
                      </Button>
                    ) : null}
                    {message.status !== "spam" ? (
                      <Button type="button" variant="outline" className="border-red-500/30 bg-transparent text-red-200" disabled={updateStatus.isPending} onClick={() => void changeStatus(message.id, "spam")}>
                        <ShieldAlert className="mr-2 h-4 w-4" />Marcar como spam
                      </Button>
                    ) : null}
                    {message.status === "resolved" || message.status === "spam" ? (
                      <Button type="button" variant="outline" className="border-white/20 bg-transparent" disabled={updateStatus.isPending} onClick={() => void changeStatus(message.id, "new")}>
                        <RotateCcw className="mr-2 h-4 w-4" />Reabrir
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>
        )}

        {total > 0 ? (
          <nav
            className="flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between"
            aria-label="Paginação das solicitações de contato"
          >
            <p className="text-sm text-gray-500" aria-live="polite">
              Página {page + 1} de {totalPages} · {total} resultado(s)
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-white/20 bg-transparent"
                disabled={page === 0 || dashboardQuery.isFetching}
                onClick={() => setPage((current) => Math.max(0, current - 1))}
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Anterior
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-white/20 bg-transparent"
                disabled={page + 1 >= totalPages || dashboardQuery.isFetching}
                onClick={() => setPage((current) => current + 1)}
              >
                Próxima
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </nav>
        ) : null}
      </div>
    </main>
  );
};

export default ContactsAdmin;

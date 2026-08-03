import {
  ChevronLeft,
  ChevronRight,
  Headphones,
  Loader2,
  Search,
  Send,
  ShieldAlert,
} from "lucide-react";
import { useState } from "react";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageState } from "@/components/ui/page-state";
import { Textarea } from "@/components/ui/textarea";
import type {
  SupportTicketPriority,
  SupportTicketStatus,
} from "@/contracts/support";
import {
  useAdminReplySupportTicket,
  useSupportAdminDashboard,
} from "@/hooks/useSupportTickets";
import { useToast } from "@/hooks/use-toast";
import { formatAppDateTime } from "@/lib/date-time";
import { getErrorMessage } from "@/lib/error-message";

const pageSize = 25;

const statusLabels: Record<SupportTicketStatus, string> = {
  open: "Aberto",
  awaiting_support: "Aguardando suporte",
  awaiting_student: "Aguardando aluno",
  resolved: "Resolvido",
  closed: "Encerrado",
};

const priorityLabels: Record<SupportTicketPriority, string> = {
  low: "Baixa",
  normal: "Normal",
  high: "Alta",
  urgent: "Urgente",
};

const SupportAdmin = () => {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<SupportTicketStatus | null>(null);
  const [priority, setPriority] = useState<SupportTicketPriority | null>(null);
  const [page, setPage] = useState(0);
  const [replyByTicket, setReplyByTicket] = useState<Record<string, string>>({});
  const [nextStatusByTicket, setNextStatusByTicket] = useState<
    Record<string, SupportTicketStatus>
  >({});
  const dashboardQuery = useSupportAdminDashboard({
    search,
    status,
    priority,
    limit: pageSize,
    offset: page * pageSize,
  });
  const replyMutation = useAdminReplySupportTicket();

  const handleReply = async (ticketId: string) => {
    const message = replyByTicket[ticketId]?.trim();
    if (!message) return;
    try {
      await replyMutation.mutateAsync({
        ticketId,
        message,
        status: nextStatusByTicket[ticketId] ?? "awaiting_student",
        idempotencyKey: crypto.randomUUID(),
      });
      setReplyByTicket((current) => ({ ...current, [ticketId]: "" }));
      toast({ title: "Resposta registrada" });
    } catch (error: unknown) {
      toast({
        title: "Não foi possível responder",
        description: getErrorMessage(error, "Tente novamente."),
        variant: "destructive",
      });
    }
  };

  const data = dashboardQuery.data;
  const summary = data?.summary;
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <AppPageShell
      context="admin"
      eyebrow="Administração"
      title="Suporte"
      description="Triagem e atendimento de tickets autenticados, com conversa e status auditáveis."
    >
      <div className="space-y-8">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label="Resumo do suporte">
          <Card><CardHeader><CardDescription>Total</CardDescription><CardTitle>{summary?.total ?? 0}</CardTitle></CardHeader></Card>
          <Card><CardHeader><CardDescription>Aguardando suporte</CardDescription><CardTitle>{summary?.awaiting_support ?? 0}</CardTitle></CardHeader></Card>
          <Card><CardHeader><CardDescription>Aguardando aluno</CardDescription><CardTitle>{summary?.awaiting_student ?? 0}</CardTitle></CardHeader></Card>
          <Card><CardHeader><CardDescription>Urgentes ativos</CardDescription><CardTitle>{summary?.urgent ?? 0}</CardTitle></CardHeader></Card>
        </section>

        <Card>
          <CardContent className="grid gap-4 p-5 lg:grid-cols-[1fr_220px_220px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                className="pl-9"
                placeholder="Buscar por referência, assunto ou email"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(0);
                }}
              />
            </div>
            <select
              aria-label="Filtrar por status"
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={status ?? ""}
              onChange={(event) => {
                setStatus((event.target.value || null) as SupportTicketStatus | null);
                setPage(0);
              }}
            >
              <option value="">Todos os status</option>
              {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select
              aria-label="Filtrar por prioridade"
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={priority ?? ""}
              onChange={(event) => {
                setPriority((event.target.value || null) as SupportTicketPriority | null);
                setPage(0);
              }}
            >
              <option value="">Todas as prioridades</option>
              {Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </CardContent>
        </Card>

        {dashboardQuery.isLoading ? (
          <PageState variant="loading" title="Carregando tickets" />
        ) : dashboardQuery.error ? (
          <PageState
            variant="error"
            title="Suporte indisponível"
            description={getErrorMessage(dashboardQuery.error, "Não foi possível carregar o suporte.")}
          />
        ) : (data?.tickets.length ?? 0) === 0 ? (
          <PageState
            variant="empty"
            icon={Headphones}
            title="Nenhum ticket encontrado"
            description="Ajuste os filtros ou aguarde novas solicitações."
          />
        ) : (
          <section className="space-y-5" aria-label="Tickets administrativos">
            {data?.tickets.map((ticket) => (
              <Card key={ticket.id}>
                <CardHeader>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <CardTitle>{ticket.subject}</CardTitle>
                      <CardDescription className="mt-2">
                        {ticket.reference_code} · {ticket.customer_email ?? ticket.user_id} · {ticket.category}
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={ticket.priority === "urgent" ? "destructive" : "outline"}>{priorityLabels[ticket.priority]}</Badge>
                      <Badge variant={ticket.status === "resolved" ? "success" : "outline"}>{statusLabels[ticket.status]}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-3">
                    {ticket.messages.map((message) => (
                      <article
                        key={message.id}
                        className={message.author_role === "support" ? "surface-muted ml-auto max-w-4xl p-4" : "max-w-4xl rounded-xl border border-course/30 bg-course/10 p-4"}
                      >
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {message.author_role === "support" ? "Suporte" : "Aluno"} · {formatAppDateTime(message.created_at)}
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{message.body}</p>
                      </article>
                    ))}
                  </div>

                  <div className="grid gap-4 rounded-xl border border-border p-4">
                    <div className="grid gap-2">
                      <Label htmlFor={`admin-support-reply-${ticket.id}`}>Resposta</Label>
                      <Textarea
                        id={`admin-support-reply-${ticket.id}`}
                        maxLength={5000}
                        value={replyByTicket[ticket.id] ?? ""}
                        onChange={(event) => setReplyByTicket((current) => ({ ...current, [ticket.id]: event.target.value }))}
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-[240px_auto] sm:items-end">
                      <div className="grid gap-2">
                        <Label htmlFor={`admin-support-status-${ticket.id}`}>Novo status</Label>
                        <select
                          id={`admin-support-status-${ticket.id}`}
                          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                          value={nextStatusByTicket[ticket.id] ?? "awaiting_student"}
                          onChange={(event) => setNextStatusByTicket((current) => ({ ...current, [ticket.id]: event.target.value as SupportTicketStatus }))}
                        >
                          {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                      </div>
                      <Button
                        type="button"
                        disabled={replyMutation.isPending || !(replyByTicket[ticket.id]?.trim())}
                        onClick={() => void handleReply(ticket.id)}
                      >
                        {replyMutation.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Send aria-hidden="true" />}
                        Registrar resposta
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>
        )}

        {total > 0 ? (
          <nav
            className="flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between"
            aria-label="Paginação dos tickets administrativos"
          >
            <p className="text-sm text-muted-foreground" aria-live="polite">
              Página {page + 1} de {totalPages} · {total} resultado(s)
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={page === 0 || dashboardQuery.isFetching}
                onClick={() => setPage((current) => Math.max(0, current - 1))}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                Anterior
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={page + 1 >= totalPages || dashboardQuery.isFetching}
                onClick={() => setPage((current) => current + 1)}
              >
                Próxima
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </nav>
        ) : null}

        <Card>
          <CardContent className="flex gap-3 p-4 text-sm text-muted-foreground">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <p>As respostas e mudanças de status são persistidas no histórico do ticket. As tabelas não possuem acesso direto pelo cliente.</p>
          </CardContent>
        </Card>
      </div>
    </AppPageShell>
  );
};

export default SupportAdmin;

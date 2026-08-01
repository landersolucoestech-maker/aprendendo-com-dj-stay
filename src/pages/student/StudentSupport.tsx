import { LifeBuoy, Loader2, MessageSquarePlus, Send } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getUserMetadataProfile } from "@/auth/user-metadata";
import { useAuth } from "@/auth/use-auth";
import { StudentSectionHeader } from "@/components/student/StudentPortalPrimitives";
import { StudentPortalShell } from "@/components/student/StudentPortalShell";
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
import type { SupportTicketPriority } from "@/contracts/support";
import {
  useAddMySupportMessage,
  useCreateSupportTicket,
  useMySupportTickets,
} from "@/hooks/useSupportTickets";
import { useToast } from "@/hooks/use-toast";
import { formatAppDateTime } from "@/lib/date-time";
import { getErrorMessage } from "@/lib/error-message";

const statusLabels = {
  open: "Aberto",
  awaiting_support: "Aguardando suporte",
  awaiting_student: "Aguardando você",
  resolved: "Resolvido",
  closed: "Encerrado",
} as const;

const priorityLabels: Record<SupportTicketPriority, string> = {
  low: "Baixa",
  normal: "Normal",
  high: "Alta",
  urgent: "Urgente",
};

const StudentSupport = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("Acesso à plataforma");
  const [priority, setPriority] = useState<SupportTicketPriority>("normal");
  const [message, setMessage] = useState("");
  const [replyByTicket, setReplyByTicket] = useState<Record<string, string>>({});
  const ticketsQuery = useMySupportTickets();
  const createMutation = useCreateSupportTicket();
  const replyMutation = useAddMySupportMessage();
  const metadata = useMemo(() => {
    if (!user) return null;
    try {
      return getUserMetadataProfile(user);
    } catch {
      return null;
    }
  }, [user]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      navigate("/login", { replace: true });
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const result = await createMutation.mutateAsync({
        subject,
        category,
        priority,
        message,
        idempotencyKey: crypto.randomUUID(),
      });
      setSubject("");
      setMessage("");
      setPriority("normal");
      toast({
        title: "Ticket criado",
        description: result.reference_code ?? "Sua solicitação foi registrada.",
      });
    } catch (error: unknown) {
      toast({
        title: "Não foi possível criar o ticket",
        description: getErrorMessage(error, "Revise os dados e tente novamente."),
        variant: "destructive",
      });
    }
  };

  const handleReply = async (ticketId: string) => {
    const reply = replyByTicket[ticketId]?.trim();
    if (!reply) return;
    try {
      await replyMutation.mutateAsync({
        ticketId,
        message: reply,
        idempotencyKey: crypto.randomUUID(),
      });
      setReplyByTicket((current) => ({ ...current, [ticketId]: "" }));
      toast({ title: "Mensagem enviada" });
    } catch (error: unknown) {
      toast({
        title: "Não foi possível enviar a mensagem",
        description: getErrorMessage(error, "Tente novamente."),
        variant: "destructive",
      });
    }
  };

  if (!user) {
    return <PageState variant="loading" title="Validando conta" />;
  }

  return (
    <StudentPortalShell
      displayName={metadata?.fullName ?? user.email ?? "Aluno"}
      email={user.email ?? ""}
      isSigningOut={isSigningOut}
      onSignOut={() => void handleSignOut()}
    >
      <div className="space-y-8">
        <StudentSectionHeader
          title="Suporte"
          description="Abra solicitações, acompanhe respostas e mantenha toda a conversa registrada."
        />

        <Card variant="course">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquarePlus className="h-5 w-5" aria-hidden="true" />
              Novo ticket
            </CardTitle>
            <CardDescription>
              Descreva uma única solicitação por ticket para facilitar o atendimento.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-5" onSubmit={(event) => void handleCreate(event)}>
              <div className="grid gap-2">
                <Label htmlFor="support-subject">Assunto</Label>
                <Input
                  id="support-subject"
                  minLength={5}
                  maxLength={200}
                  required
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="support-category">Categoria</Label>
                  <select
                    id="support-category"
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                  >
                    <option>Acesso à plataforma</option>
                    <option>Curso ou aula</option>
                    <option>Pagamento</option>
                    <option>Produto digital</option>
                    <option>Certificado</option>
                    <option>Outro</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="support-priority">Prioridade</Label>
                  <select
                    id="support-priority"
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={priority}
                    onChange={(event) =>
                      setPriority(event.target.value as SupportTicketPriority)
                    }
                  >
                    {Object.entries(priorityLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="support-message">Mensagem</Label>
                <Textarea
                  id="support-message"
                  minLength={2}
                  maxLength={5000}
                  rows={6}
                  required
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                />
              </div>
              <Button type="submit" className="w-full sm:w-auto" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <Loader2 className="animate-spin" aria-hidden="true" />
                ) : (
                  <LifeBuoy aria-hidden="true" />
                )}
                Abrir ticket
              </Button>
            </form>
          </CardContent>
        </Card>

        {ticketsQuery.isLoading ? (
          <PageState variant="loading" title="Carregando tickets" />
        ) : ticketsQuery.error ? (
          <PageState
            variant="error"
            title="Suporte indisponível"
            description={getErrorMessage(ticketsQuery.error, "Não foi possível carregar seus tickets.")}
          />
        ) : (ticketsQuery.data?.tickets.length ?? 0) === 0 ? (
          <PageState
            variant="empty"
            icon={LifeBuoy}
            title="Nenhum ticket aberto"
            description="Suas solicitações aparecerão aqui depois do primeiro envio."
          />
        ) : (
          <section className="space-y-5" aria-label="Tickets de suporte">
            {ticketsQuery.data?.tickets.map((ticket) => (
              <Card key={ticket.id} variant="course">
                <CardHeader>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <CardTitle>{ticket.subject}</CardTitle>
                      <CardDescription className="mt-2">
                        {ticket.reference_code} · {ticket.category} · atualizado em {formatAppDateTime(ticket.updated_at)}
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={ticket.priority === "urgent" ? "destructive" : "outline"}>
                        {priorityLabels[ticket.priority]}
                      </Badge>
                      <Badge variant={ticket.status === "resolved" ? "success" : "outline"}>
                        {statusLabels[ticket.status]}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-3">
                    {ticket.messages.map((item) => (
                      <article
                        key={item.id}
                        className={item.author_role === "student" ? "surface-muted ml-auto max-w-3xl p-4" : "max-w-3xl rounded-xl border border-course/30 bg-course/10 p-4"}
                      >
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {item.author_role === "student" ? "Você" : "Suporte"} · {formatAppDateTime(item.created_at)}
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{item.body}</p>
                      </article>
                    ))}
                  </div>

                  {ticket.status !== "closed" ? (
                    <div className="grid gap-3">
                      <Label htmlFor={`reply-${ticket.id}`}>Responder</Label>
                      <Textarea
                        id={`reply-${ticket.id}`}
                        maxLength={5000}
                        value={replyByTicket[ticket.id] ?? ""}
                        onChange={(event) =>
                          setReplyByTicket((current) => ({
                            ...current,
                            [ticket.id]: event.target.value,
                          }))
                        }
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full sm:w-auto"
                        disabled={replyMutation.isPending || !(replyByTicket[ticket.id]?.trim())}
                        onClick={() => void handleReply(ticket.id)}
                      >
                        <Send aria-hidden="true" />
                        Enviar resposta
                      </Button>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </section>
        )}
      </div>
    </StudentPortalShell>
  );
};

export default StudentSupport;

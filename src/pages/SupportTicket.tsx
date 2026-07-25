import { FormEvent, useState } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import PortalHeader from "@/components/portal/PortalHeader";
import { useReplySupportTicket, useSupportTicket, useUpdateTicketStatus } from "@/hooks/useSupport";
import { useToast } from "@/hooks/use-toast";
import { formatDate, TicketStatus } from "@/lib/platform";

export default function SupportTicket({ staff = false }: { staff?: boolean }) {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: ticket, isLoading, error } = useSupportTicket(ticketId);
  const reply = useReplySupportTicket();
  const updateStatus = useUpdateTicketStatus();
  const [message, setMessage] = useState("");
  const [internal, setInternal] = useState(false);

  const send = async (event: FormEvent) => {
    event.preventDefault();
    if (!ticketId || !message.trim()) return;
    try {
      await reply.mutateAsync({ ticketId, message, internal: staff && internal });
      setMessage("");
      toast({ title: "Resposta enviada" });
    } catch (replyError) {
      toast({ title: "Erro", description: replyError instanceof Error ? replyError.message : "Não foi possível enviar.", variant: "destructive" });
    }
  };

  const changeStatus = async (status: TicketStatus) => {
    if (!ticketId) return;
    try {
      await updateStatus.mutateAsync({ ticketId, status });
      toast({ title: "Status atualizado" });
    } catch (statusError) {
      toast({ title: "Erro", description: statusError instanceof Error ? statusError.message : "Não foi possível atualizar.", variant: "destructive" });
    }
  };

  const content = (
    <div className={staff ? "p-5 md:p-8 space-y-6" : "container mx-auto px-4 py-8 space-y-6"}>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(staff ? "/instrutor/atendimento" : "/suporte")}><ArrowLeft className="w-5 h-5" /></Button>
        <div><p className="text-sm text-gray-400">{ticket?.ticket_number || "Atendimento"}</p><h1 className="text-2xl md:text-3xl font-bold gradient-text">{ticket?.subject || "Carregando..."}</h1></div>
      </div>
      {isLoading && <p className="text-gray-400">Carregando conversa...</p>}
      {error && <p className="text-red-400">{error.message}</p>}
      {ticket && (
        <div className="grid lg:grid-cols-[1fr_300px] gap-6 items-start">
          <div className="space-y-4">
            <Card className="glass-card border-white/10"><CardContent className="p-5 space-y-4 max-h-[55vh] overflow-y-auto">{ticket.messages?.map((entry: any) => <div key={entry.id} className={`rounded-lg border p-4 ${entry.is_internal ? "border-yellow-500/30 bg-yellow-500/10" : "border-white/10 bg-black/30"}`}><div className="flex justify-between gap-3 text-xs text-gray-500 mb-2"><span>{entry.profiles?.full_name || "Usuário"}{entry.is_internal ? " · nota interna" : ""}</span><span>{formatDate(entry.created_at)}</span></div><p className="whitespace-pre-wrap text-sm">{entry.body}</p></div>)}</CardContent></Card>
            <Card className="glass-card border-white/10"><CardHeader><CardTitle className="text-white text-lg">Responder</CardTitle></CardHeader><CardContent><form onSubmit={send} className="space-y-3"><div className="space-y-2"><Label>Mensagem</Label><Textarea rows={5} value={message} onChange={(event) => setMessage(event.target.value)} required /></div>{staff && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={internal} onChange={(event) => setInternal(event.target.checked)} />Nota interna, invisível para o aluno</label>}<div className="flex justify-end"><Button type="submit" disabled={reply.isPending}><Send className="w-4 h-4 mr-2" />{reply.isPending ? "Enviando..." : "Enviar resposta"}</Button></div></form></CardContent></Card>
          </div>
          <Card className="glass-card border-white/10 lg:sticky lg:top-6"><CardHeader><CardTitle className="text-white text-lg">Detalhes</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><div><p className="text-gray-500">Status</p><p>{ticket.status}</p></div><div><p className="text-gray-500">Prioridade</p><p>{ticket.priority}</p></div><div><p className="text-gray-500">Categoria</p><p>{ticket.category}</p></div>{ticket.profiles?.full_name && <div><p className="text-gray-500">Aluno</p><p>{ticket.profiles.full_name}</p></div>}{ticket.courses?.title && <div><p className="text-gray-500">Curso</p><p>{ticket.courses.title}</p></div>}{ticket.orders?.order_number && <div><p className="text-gray-500">Pedido</p><p>{ticket.orders.order_number}</p></div>}{staff && <div className="border-t border-white/10 pt-3 space-y-2"><p className="text-gray-500">Alterar status</p><select className="w-full h-10 rounded-md border border-white/20 bg-black px-3" value={ticket.status} onChange={(event) => void changeStatus(event.target.value as TicketStatus)} disabled={updateStatus.isPending}><option value="open">Aberto</option><option value="in_progress">Em atendimento</option><option value="waiting_customer">Aguardando aluno</option><option value="resolved">Resolvido</option><option value="closed">Fechado</option></select></div>}</CardContent></Card>
        </div>
      )}
    </div>
  );

  if (staff) return content;
  return <div className="min-h-screen bg-black text-white"><PortalHeader />{content}</div>;
}

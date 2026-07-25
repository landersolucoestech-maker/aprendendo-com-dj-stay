import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Headphones, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import PortalHeader from "@/components/portal/PortalHeader";
import { useCreateSupportTicket, useSupportTickets } from "@/hooks/useSupport";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/platform";

export default function Support() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: tickets, isLoading, error } = useSupportTickets("mine");
  const createTicket = useCreateSupportTicket();
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("general");
  const [priority, setPriority] = useState<"low" | "normal" | "high" | "urgent">("normal");
  const [message, setMessage] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const ticket = await createTicket.mutateAsync({ subject, message, category, priority });
      setSubject(""); setMessage(""); setShowForm(false);
      toast({ title: "Atendimento criado", description: `Protocolo ${ticket.ticket_number}` });
      navigate(`/suporte/${ticket.id}`);
    } catch (creationError) {
      toast({ title: "Erro", description: creationError instanceof Error ? creationError.message : "Não foi possível abrir o atendimento.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <PortalHeader />
      <main className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between gap-4"><div><p className="text-sm text-gray-400">Central de ajuda</p><h1 className="text-3xl font-bold gradient-text">Suporte</h1></div><Button onClick={() => setShowForm((value) => !value)}><Plus className="w-4 h-4 mr-2" />Novo atendimento</Button></div>
        {showForm && <Card className="glass-card border-white/10"><CardHeader><CardTitle className="text-white">Abrir atendimento</CardTitle></CardHeader><CardContent><form onSubmit={submit} className="grid md:grid-cols-2 gap-4"><div className="space-y-2 md:col-span-2"><Label>Assunto</Label><Input value={subject} onChange={(event) => setSubject(event.target.value)} required /></div><div className="space-y-2"><Label>Categoria</Label><select className="w-full h-10 rounded-md border border-white/20 bg-black px-3" value={category} onChange={(event) => setCategory(event.target.value)}><option value="general">Geral</option><option value="access">Acesso</option><option value="course">Curso</option><option value="payment">Pagamento</option><option value="refund">Reembolso</option><option value="technical">Problema técnico</option><option value="certificate">Certificado</option></select></div><div className="space-y-2"><Label>Prioridade</Label><select className="w-full h-10 rounded-md border border-white/20 bg-black px-3" value={priority} onChange={(event) => setPriority(event.target.value as typeof priority)}><option value="low">Baixa</option><option value="normal">Normal</option><option value="high">Alta</option><option value="urgent">Urgente</option></select></div><div className="space-y-2 md:col-span-2"><Label>Mensagem</Label><Textarea rows={6} value={message} onChange={(event) => setMessage(event.target.value)} required /></div><div className="md:col-span-2 flex justify-end"><Button type="submit" disabled={createTicket.isPending}>{createTicket.isPending ? "Enviando..." : "Criar atendimento"}</Button></div></form></CardContent></Card>}
        {isLoading && <p className="text-gray-400">Carregando atendimentos...</p>}
        {error && <p className="text-red-400">{error.message}</p>}
        {!isLoading && !tickets?.length && <Card className="glass-card border-white/10"><CardContent className="p-10 text-center"><Headphones className="w-10 h-10 mx-auto text-gray-500 mb-3" /><p>Você não possui atendimentos.</p></CardContent></Card>}
        <div className="grid gap-3">{tickets?.map((ticket: any) => <button type="button" key={ticket.id} onClick={() => navigate(`/suporte/${ticket.id}`)} className="text-left"><Card className="glass-card border-white/10 hover:bg-white/5"><CardContent className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3"><div><p className="font-semibold">{ticket.subject}</p><p className="text-sm text-gray-500">{ticket.ticket_number} · atualizado em {formatDate(ticket.last_message_at)}</p></div><div className="flex gap-2"><span className="rounded-full bg-white/10 px-2 py-1 text-xs">{ticket.priority}</span><span className="rounded-full bg-white/10 px-2 py-1 text-xs">{ticket.status}</span></div></CardContent></Card></button>)}</div>
      </main>
    </div>
  );
}

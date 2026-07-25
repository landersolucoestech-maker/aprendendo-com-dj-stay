import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Headphones, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSupportTickets } from "@/hooks/useSupport";
import { formatDate } from "@/lib/platform";

export default function InstructorSupport() {
  const navigate = useNavigate();
  const { data: tickets, isLoading, error } = useSupportTickets("staff");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("open");

  const filtered = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return (tickets ?? []).filter((ticket: any) => {
      const matchesSearch = !normalized
        || ticket.ticket_number.toLowerCase().includes(normalized)
        || ticket.subject.toLowerCase().includes(normalized)
        || String(ticket.profiles?.full_name ?? "").toLowerCase().includes(normalized);
      const matchesStatus = status === "all"
        || (status === "open" && !["resolved", "closed"].includes(ticket.status))
        || ticket.status === status;
      return matchesSearch && matchesStatus;
    });
  }, [search, status, tickets]);

  return (
    <div className="p-5 md:p-8 space-y-6">
      <div>
        <p className="text-sm text-gray-400">Fila de atendimento</p>
        <h1 className="text-3xl font-bold gradient-text">Atendimento</h1>
      </div>
      <div className="grid md:grid-cols-[1fr_220px] gap-3">
        <div className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar ticket, aluno ou assunto" /></div>
        <select className="h-10 rounded-md border border-white/20 bg-black px-3" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="open">Em aberto</option><option value="all">Todos</option><option value="in_progress">Em atendimento</option><option value="waiting_customer">Aguardando aluno</option><option value="resolved">Resolvidos</option><option value="closed">Fechados</option>
        </select>
      </div>
      {isLoading && <p className="text-gray-400">Carregando atendimentos...</p>}
      {error && <p className="text-red-400">{error.message}</p>}
      {!isLoading && filtered.length === 0 && <Card className="glass-card border-white/10"><CardContent className="p-10 text-center"><Headphones className="w-10 h-10 mx-auto text-gray-500 mb-3" /><p>Nenhum atendimento encontrado.</p></CardContent></Card>}
      <div className="grid gap-3">
        {filtered.map((ticket: any) => (
          <Card key={ticket.id} className="glass-card border-white/10">
            <CardContent className="p-5 grid lg:grid-cols-[1.5fr_1fr_180px_130px] gap-4 items-center">
              <div><p className="font-semibold">{ticket.subject}</p><p className="text-sm text-gray-500">{ticket.ticket_number} · {ticket.profiles?.full_name || "Aluno"}</p></div>
              <div><p className="text-sm">{ticket.courses?.title || ticket.category}</p><p className="text-xs text-gray-500">Atualizado em {formatDate(ticket.last_message_at)}</p></div>
              <div className="flex gap-2"><span className="rounded-full bg-white/10 px-2 py-1 text-xs">{ticket.priority}</span><span className="rounded-full bg-white/10 px-2 py-1 text-xs">{ticket.status}</span></div>
              <Button size="sm" variant="outline" onClick={() => navigate(`/instrutor/atendimento/${ticket.id}`)}>Abrir</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

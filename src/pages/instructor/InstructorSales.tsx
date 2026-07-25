import { useMemo, useState } from "react";
import { Receipt, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useRefundPayment } from "@/hooks/useCommerce";
import { useInstructorSalesReport } from "@/hooks/useInstructorSales";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate } from "@/lib/platform";

export default function InstructorSales() {
  const { hasRole } = useAuth();
  const { toast } = useToast();
  const { data: orders, isLoading, error } = useInstructorSalesReport();
  const refund = useRefundPayment();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const canRefund = hasRole("admin", "owner");

  const filtered = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return (orders ?? []).filter((order: any) => {
      const customer = String(order.customer_snapshot?.full_name ?? "").toLowerCase();
      const courses = (order.order_items ?? []).map((item: any) => item.course_title).join(" ").toLowerCase();
      const matchesSearch = !normalized || order.order_number.toLowerCase().includes(normalized) || customer.includes(normalized) || courses.includes(normalized);
      return matchesSearch && (status === "all" || order.status === status);
    });
  }, [orders, search, status]);

  const requestRefund = async (payment: any, order: any) => {
    const reason = window.prompt(`Motivo do reembolso do pedido ${order.order_number}:`);
    if (reason === null) return;
    if (!window.confirm(`Confirmar reembolso integral de ${formatCurrency(payment.amount_cents)}? O acesso do aluno será revogado.`)) return;
    try {
      await refund.mutateAsync({ paymentId: payment.id, reason });
      toast({ title: "Reembolso processado", description: "O pedido e a matrícula foram atualizados." });
    } catch (refundError) {
      toast({ title: "Erro no reembolso", description: refundError instanceof Error ? refundError.message : "Não foi possível reembolsar.", variant: "destructive" });
    }
  };

  return (
    <div className="p-5 md:p-8 space-y-6">
      <div>
        <p className="text-sm text-gray-400">Pedidos, pagamentos e reembolsos</p>
        <h1 className="text-3xl font-bold gradient-text">Vendas</h1>
      </div>
      <div className="grid md:grid-cols-[1fr_220px] gap-3">
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar pedido, cliente ou curso" />
        <select className="h-10 rounded-md border border-white/20 bg-black px-3" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="all">Todos os status</option><option value="awaiting_payment">Aguardando pagamento</option><option value="paid">Pago</option><option value="partially_refunded">Parcialmente reembolsado</option><option value="refunded">Reembolsado</option><option value="chargeback">Chargeback</option><option value="cancelled">Cancelado</option>
        </select>
      </div>
      {isLoading && <p className="text-gray-400">Carregando vendas...</p>}
      {error && <p className="text-red-400">{error.message}</p>}
      {!isLoading && filtered.length === 0 && <Card className="glass-card border-white/10"><CardContent className="p-10 text-center"><Receipt className="w-10 h-10 mx-auto text-gray-500 mb-3" /><p>Nenhuma venda encontrada.</p></CardContent></Card>}
      <div className="grid gap-3">
        {filtered.map((order: any) => {
          const payment = order.payments?.find((entry: any) => ["approved", "partially_refunded"].includes(entry.status)) ?? order.payments?.[0];
          const refunded = (order.refunds ?? []).filter((entry: any) => entry.status === "approved").reduce((sum: number, entry: any) => sum + entry.amount_cents, 0);
          return (
            <Card key={order.id} className="glass-card border-white/10">
              <CardContent className="p-5 space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div><p className="font-semibold">{order.order_number}</p><p className="text-sm text-gray-400">{order.customer_snapshot?.full_name || "Cliente"} · {formatDate(order.created_at)}</p></div>
                  <div className="lg:text-right"><p className="text-xl font-bold">{formatCurrency(order.total_cents, order.currency)}</p><span className="inline-flex rounded-full bg-white/10 px-2.5 py-1 text-xs mt-1">{order.status}</span></div>
                </div>
                <div className="grid md:grid-cols-2 gap-2">{order.order_items?.map((item: any) => <div key={item.id} className="rounded-md border border-white/10 p-3"><p>{item.course_title}</p><p className="text-xs text-gray-500">{item.offer_name} · {formatCurrency(item.total_amount_cents, order.currency)}</p></div>)}</div>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-t border-white/10 pt-4 text-sm">
                  <div className="text-gray-400">{payment ? `${payment.provider} · ${payment.payment_method || "método não informado"} · ${payment.status}` : "Sem pagamento confirmado"}{refunded > 0 && ` · Reembolsado: ${formatCurrency(refunded)}`}</div>
                  {canRefund && payment && ["approved", "partially_refunded"].includes(payment.status) && refunded < payment.amount_cents && <Button variant="outline" size="sm" onClick={() => requestRefund(payment, order)} disabled={refund.isPending}><RotateCcw className="w-4 h-4 mr-2" />Reembolsar</Button>}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

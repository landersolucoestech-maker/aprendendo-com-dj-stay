import { Receipt } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import PortalHeader from "@/components/portal/PortalHeader";
import { useMyOrders } from "@/hooks/useCommerce";
import { formatCurrency, formatDate } from "@/lib/platform";

export default function Orders() {
  const { data: orders, isLoading, error } = useMyOrders();

  return (
    <div className="min-h-screen bg-black text-white">
      <PortalHeader />
      <main className="container mx-auto px-4 py-8 space-y-6">
        <div><p className="text-sm text-gray-400">Histórico financeiro</p><h1 className="text-3xl font-bold gradient-text">Meus pedidos</h1></div>
        {isLoading && <p className="text-gray-400">Carregando pedidos...</p>}
        {error && <p className="text-red-400">{error.message}</p>}
        {!isLoading && !orders?.length && <Card className="glass-card border-white/10"><CardContent className="p-10 text-center"><Receipt className="w-10 h-10 mx-auto text-gray-500 mb-3" /><p>Nenhum pedido encontrado.</p></CardContent></Card>}
        <div className="grid gap-3">
          {orders?.map((order: any) => (
            <Card key={order.id} className="glass-card border-white/10">
              <CardContent className="p-5 space-y-4">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div><p className="font-semibold">{order.order_number}</p><p className="text-sm text-gray-500">Criado em {formatDate(order.created_at)}</p></div>
                  <div className="md:text-right"><p className="text-xl font-bold">{formatCurrency(order.total_cents, order.currency)}</p><span className="inline-flex rounded-full bg-white/10 px-2.5 py-1 text-xs mt-1">{order.status}</span></div>
                </div>
                <div className="grid md:grid-cols-2 gap-2">{order.order_items?.map((item: any) => <div key={item.id} className="rounded-md border border-white/10 p-3"><p>{item.course_title}</p><p className="text-xs text-gray-500">{item.offer_name}</p></div>)}</div>
                {order.payments?.length > 0 && <div className="border-t border-white/10 pt-3 text-sm text-gray-400">{order.payments.map((payment: any) => <p key={payment.id}>{payment.provider} · {payment.payment_method || "método pendente"} · {payment.status}{payment.approved_at ? ` · aprovado em ${formatDate(payment.approved_at)}` : ""}</p>)}</div>}
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}

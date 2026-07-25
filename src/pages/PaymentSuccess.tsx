import { CheckCircle, Clock3, Receipt, XCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import PortalHeader from "@/components/portal/PortalHeader";
import { db, formatCurrency } from "@/lib/platform";

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const orderId = params.get("order_id");
  const { data: order, isLoading, error } = useQuery({
    queryKey: ["payment-return-order", orderId],
    enabled: Boolean(orderId),
    refetchInterval: (query) => ["paid", "refunded", "chargeback", "cancelled"].includes(String(query.state.data?.status)) ? false : 3000,
    queryFn: async () => {
      const { data, error: queryError } = await db.from("orders").select(`
        id,order_number,status,currency,total_cents,paid_at,
        order_items(id,course_id,course_title),payments(id,status,provider,payment_method,approved_at)
      `).eq("id", orderId).single();
      if (queryError) throw queryError;
      return data;
    },
  });

  const paid = order?.status === "paid";
  const failed = ["cancelled", "refunded", "chargeback"].includes(order?.status);

  return (
    <div className="min-h-screen bg-black text-white">
      <PortalHeader />
      <main className="container mx-auto px-4 py-12 flex justify-center">
        <Card className="glass-card border-white/10 max-w-lg w-full text-center">
          <CardHeader>
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${paid ? "bg-green-500/20" : failed ? "bg-red-500/20" : "bg-yellow-500/20"}`}>
              {paid ? <CheckCircle className="w-10 h-10 text-green-400" /> : failed ? <XCircle className="w-10 h-10 text-red-400" /> : <Clock3 className="w-10 h-10 text-yellow-400" />}
            </div>
            <CardTitle className="text-2xl text-white">{paid ? "Pagamento confirmado" : failed ? "Pagamento não concluído" : "Confirmando pagamento"}</CardTitle>
            <CardDescription className="text-gray-300">{paid ? "O webhook foi validado, o pedido foi pago e seu acesso foi liberado." : failed ? "O pedido não possui um pagamento aprovado." : "Recebemos o retorno do provedor e estamos aguardando a confirmação segura do pagamento."}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading && <p className="text-gray-400">Consultando pedido...</p>}
            {error && <p className="text-red-400">Não foi possível consultar o pedido: {error.message}</p>}
            {order && <div className="rounded-lg border border-white/10 p-4 text-left text-sm space-y-2"><div className="flex justify-between"><span className="text-gray-400">Pedido</span><span>{order.order_number}</span></div><div className="flex justify-between"><span className="text-gray-400">Status</span><span>{order.status}</span></div><div className="flex justify-between"><span className="text-gray-400">Total</span><span>{formatCurrency(order.total_cents, order.currency)}</span></div></div>}
            <div className="grid gap-2">
              {paid && <Button onClick={() => navigate("/meus-cursos")}><Receipt className="w-4 h-4 mr-2" />Acessar meus cursos</Button>}
              {!paid && !failed && <Button variant="outline" onClick={() => navigate("/pedidos")}>Acompanhar em meus pedidos</Button>}
              {failed && <Button onClick={() => navigate("/carrinho")}>Voltar ao carrinho</Button>}
              <Button variant="ghost" onClick={() => navigate("/dashboard")}>Ir para o dashboard</Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

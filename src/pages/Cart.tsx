import { FormEvent, useState } from "react";
import { ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import PortalHeader from "@/components/portal/PortalHeader";
import { useActiveCart, useApplyCoupon, useCreateCheckout, useCreateOrder, useRemoveCartItem } from "@/hooks/useCommerce";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/platform";

export default function Cart() {
  const { toast } = useToast();
  const { data: cart, isLoading, error } = useActiveCart();
  const removeItem = useRemoveCartItem();
  const applyCoupon = useApplyCoupon();
  const createOrder = useCreateOrder();
  const createCheckout = useCreateCheckout();
  const [coupon, setCoupon] = useState("");

  const apply = async (event: FormEvent) => {
    event.preventDefault();
    if (!coupon.trim()) return;
    try {
      await applyCoupon.mutateAsync(coupon);
      toast({ title: "Cupom aplicado" });
    } catch (couponError) {
      toast({ title: "Cupom inválido", description: couponError instanceof Error ? couponError.message : "Não foi possível aplicar.", variant: "destructive" });
    }
  };

  const checkout = async () => {
    if (!cart?.id) return;
    try {
      const order = await createOrder.mutateAsync(cart.id);
      const checkoutData = await createCheckout.mutateAsync(order.id);
      window.location.assign(checkoutData.checkout_url);
    } catch (checkoutError) {
      toast({ title: "Erro no checkout", description: checkoutError instanceof Error ? checkoutError.message : "Não foi possível iniciar o pagamento.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <PortalHeader />
      <main className="container mx-auto px-4 py-8 space-y-6">
        <div><p className="text-sm text-gray-400">Compra segura</p><h1 className="text-3xl font-bold gradient-text">Carrinho</h1></div>
        {isLoading && <p className="text-gray-400">Carregando carrinho...</p>}
        {error && <p className="text-red-400">{error.message}</p>}
        {!isLoading && (!cart || !cart.cart_items?.length) && <Card className="glass-card border-white/10"><CardContent className="p-10 text-center"><ShoppingCart className="w-10 h-10 mx-auto text-gray-500 mb-3" /><p>Seu carrinho está vazio.</p></CardContent></Card>}
        {cart?.cart_items?.length > 0 && (
          <div className="grid lg:grid-cols-[1fr_360px] gap-6 items-start">
            <div className="space-y-3">
              {cart.cart_items.map((item: any) => (
                <Card key={item.id} className="glass-card border-white/10">
                  <CardContent className="p-5 flex items-center justify-between gap-4">
                    <div><h2 className="font-semibold">{item.offer_snapshot?.course_title || item.offer_snapshot?.product_name}</h2><p className="text-sm text-gray-500">{item.offer_snapshot?.offer_name} · {item.offer_snapshot?.lifetime_access ? "Acesso vitalício" : `${item.offer_snapshot?.access_days} dias`}</p></div>
                    <div className="flex items-center gap-3"><strong>{formatCurrency(item.total_amount_cents, cart.currency)}</strong><Button variant="ghost" size="icon" onClick={() => removeItem.mutate(item.id)} disabled={removeItem.isPending}><Trash2 className="w-4 h-4" /></Button></div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card className="glass-card border-white/10 lg:sticky lg:top-24">
              <CardHeader><CardTitle className="text-white">Resumo</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm"><div className="flex justify-between"><span className="text-gray-400">Subtotal</span><span>{formatCurrency(cart.subtotal_cents, cart.currency)}</span></div><div className="flex justify-between"><span className="text-gray-400">Desconto</span><span>- {formatCurrency(cart.discount_cents, cart.currency)}</span></div><div className="border-t border-white/10 pt-3 flex justify-between text-lg font-bold"><span>Total</span><span>{formatCurrency(cart.total_cents, cart.currency)}</span></div></div>
                <form onSubmit={apply} className="flex gap-2"><Input value={coupon} onChange={(event) => setCoupon(event.target.value)} placeholder="Cupom de desconto" /><Button type="submit" variant="outline" disabled={applyCoupon.isPending}>Aplicar</Button></form>
                {cart.coupons?.code && <p className="text-xs text-green-400">Cupom {cart.coupons.code} aplicado.</p>}
                <Button className="w-full" onClick={checkout} disabled={createOrder.isPending || createCheckout.isPending}>{createOrder.isPending || createCheckout.isPending ? "Preparando pagamento..." : "Pagar com Mercado Pago"}</Button>
                <p className="text-xs text-gray-500 text-center">Pix e cartão são processados pelo Mercado Pago. O acesso é liberado somente após confirmação do pagamento.</p>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

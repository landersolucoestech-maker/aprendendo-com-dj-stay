import { ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PortalHeader from "@/components/portal/PortalHeader";
import { useAddOfferToCart, useCatalogOffers } from "@/hooks/useCommerce";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/platform";

export default function Catalog() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: offers, isLoading, error } = useCatalogOffers();
  const addToCart = useAddOfferToCart();

  const add = async (offerId: string) => {
    try {
      await addToCart.mutateAsync(offerId);
      toast({ title: "Curso adicionado", description: "O item foi incluído no carrinho." });
      navigate("/carrinho");
    } catch (cartError) {
      toast({ title: "Erro", description: cartError instanceof Error ? cartError.message : "Não foi possível adicionar ao carrinho.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <PortalHeader />
      <main className="container mx-auto px-4 py-8 space-y-6">
        <div><p className="text-sm text-gray-400">Formação disponível</p><h1 className="text-3xl font-bold gradient-text">Catálogo de cursos</h1></div>
        {isLoading && <p className="text-gray-400">Carregando catálogo...</p>}
        {error && <p className="text-red-400">{error.message}</p>}
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {offers?.map((offer: any) => {
            const course = offer.products?.courses;
            return (
              <Card key={offer.id} className="glass-card border-white/10 overflow-hidden">
                {course?.cover_image_path && <div className="aspect-video bg-cover bg-center" style={{ backgroundImage: `url(${course.cover_image_path})` }} />}
                <CardHeader><CardTitle className="text-white">{course?.title || offer.products?.name}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-400 line-clamp-3">{course?.short_description || offer.description || offer.products?.description}</p>
                  <div className="flex items-end gap-2"><strong className="text-2xl">{formatCurrency(offer.amount_cents, offer.currency)}</strong>{offer.compare_at_cents && <span className="text-sm text-gray-500 line-through">{formatCurrency(offer.compare_at_cents, offer.currency)}</span>}</div>
                  <p className="text-xs text-gray-500">Até {offer.max_installments}x · {offer.lifetime_access ? "Acesso vitalício" : `${offer.access_days} dias de acesso`}</p>
                  <Button className="w-full" onClick={() => add(offer.id)} disabled={addToCart.isPending}><ShoppingCart className="w-4 h-4 mr-2" />Adicionar ao carrinho</Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}

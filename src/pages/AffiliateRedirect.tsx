import { Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { affiliateClickResultSchema } from "@/contracts/affiliate";
import { parseDataContract } from "@/contracts/contract-error";
import { supabase } from "@/integrations/supabase/client";
import { ensureAffiliateVisitorToken } from "@/lib/affiliate-attribution";

const AffiliateRedirect = () => {
  const { code } = useParams<{ code: string }>();
  const startedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const trackAndRedirect = async (): Promise<void> => {
      if (!code) {
        setError("Link de afiliado inválido.");
        return;
      }

      try {
        const visitorToken = ensureAffiliateVisitorToken();
        const referrerOrigin = document.referrer
          ? new URL(document.referrer).origin
          : undefined;
        const { data, error: rpcError } = await supabase.rpc("record_affiliate_click", {
          p_link_code: code,
          p_visitor_token: visitorToken,
          p_landing_path: window.location.pathname,
          ...(referrerOrigin ? { p_referrer_origin: referrerOrigin } : {}),
          p_user_agent: navigator.userAgent.slice(0, 1000),
        });
        if (rpcError) throw rpcError;

        const result = parseDataContract(
          affiliateClickResultSchema,
          data,
          "redirecionamento do afiliado",
        );
        if (!result.accepted || !result.destination_path) {
          throw new Error(result.reason ?? "AFFILIATE_LINK_NOT_AVAILABLE");
        }

        window.location.replace(result.destination_path);
      } catch {
        setError("Este link não está mais disponível ou não pôde ser validado.");
      }
    };

    void trackAndRedirect();
  }, [code]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
      <section className="w-full max-w-lg rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
        {error ? (
          <>
            <ShieldCheck className="mx-auto h-10 w-10 text-violet-300" />
            <h1 className="mt-4 text-2xl font-bold">Link indisponível</h1>
            <p className="mt-3 text-sm leading-6 text-gray-400">{error}</p>
            <Link to="/marketplace" className="mt-6 inline-block">
              <Button className="btn-brand">Acessar o marketplace</Button>
            </Link>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-violet-300" />
            <h1 className="mt-4 text-2xl font-bold">Validando o acesso</h1>
            <p className="mt-3 text-sm text-gray-400">
              O link está sendo validado antes do redirecionamento.
            </p>
          </>
        )}
      </section>
    </main>
  );
};

export default AffiliateRedirect;

import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";

import { getAuthErrorMessage } from "@/auth/auth-errors";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { AuthLoadingScreen } from "@/routing/AuthLoadingScreen";

function safeNextPath(value: string | null): string {
  if (!value?.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
}

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const providerError = searchParams.get("error_description");
  const code = searchParams.get("code");
  const nextPath = safeNextPath(searchParams.get("next"));

  useEffect(() => {
    if (providerError || !code) {
      return;
    }

    let active = true;

    void supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (!active) {
        return;
      }

      if (error) {
        setErrorMessage(getAuthErrorMessage(error));
        return;
      }

      navigate(nextPath, { replace: true });
    });

    return () => {
      active = false;
    };
  }, [code, navigate, nextPath, providerError]);

  if (providerError || errorMessage) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold">Não foi possível validar o link</h1>
          <p className="text-gray-300">{providerError ?? errorMessage}</p>
          <Link to="/login"><Button className="btn-neon">Voltar ao login</Button></Link>
        </div>
      </div>
    );
  }

  if (!code) {
    return <Navigate to="/login" replace />;
  }

  return <AuthLoadingScreen />;
};

export default AuthCallback;

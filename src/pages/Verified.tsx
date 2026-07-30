import { ArrowRight, CheckCircle, Home } from "lucide-react";
import { Link } from "react-router-dom";

import { useAuth } from "@/auth/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Verified = () => {
  const { session } = useAuth();
  const primaryPath = session ? "/dashboard" : "/login";
  const primaryLabel = session ? "Ir para o dashboard" : "Fazer login";

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <Card className="glass-card border-white/10 max-w-md w-full text-center">
        <CardHeader>
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle className="w-10 h-10 text-green-400" /></div>
          <CardTitle className="text-2xl">Email confirmado</CardTitle>
          <CardDescription className="text-gray-300">A confirmação foi processada pelo Supabase Auth.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Link to={primaryPath} className="block"><Button className="w-full btn-brand"><ArrowRight className="w-4 h-4 mr-2" />{primaryLabel}</Button></Link>
          <Link to="/" className="block"><Button variant="secondary" className="w-full"><Home className="w-4 h-4 mr-2" />Voltar ao início</Button></Link>
        </CardContent>
      </Card>
    </div>
  );
};

export default Verified;

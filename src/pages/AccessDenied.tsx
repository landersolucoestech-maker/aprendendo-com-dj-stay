import { AlertTriangle, ArrowLeft, Home } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "@/auth/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const AccessDenied = () => {
  const navigate = useNavigate();
  const { session } = useAuth();

  return <div className="min-h-screen bg-black text-white flex items-center justify-center p-4"><Card className="glass-card border-white/10 max-w-md w-full text-center"><CardHeader><div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle className="w-10 h-10 text-red-400" /></div><CardTitle className="text-2xl">Acesso negado</CardTitle><CardDescription className="text-gray-300">Sua sessão não possui acesso a esta página.</CardDescription></CardHeader><CardContent className="space-y-3"><Button onClick={() => navigate(-1)} variant="outline" className="w-full"><ArrowLeft className="w-4 h-4 mr-2" />Voltar</Button><Link to="/" className="block"><Button className="w-full btn-brand"><Home className="w-4 h-4 mr-2" />Início</Button></Link>{!session && <Link to="/login" className="block"><Button variant="secondary" className="w-full">Fazer login</Button></Link>}</CardContent></Card></div>;
};

export default AccessDenied;

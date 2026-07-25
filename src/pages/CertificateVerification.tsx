import { useQuery } from "@tanstack/react-query";
import { Award, CheckCircle2, XCircle } from "lucide-react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { db, formatDate } from "@/lib/platform";

export default function CertificateVerification() {
  const { code } = useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ["certificate-verification", code],
    enabled: Boolean(code),
    queryFn: async () => {
      const { data, error: queryError } = await db.rpc("verify_certificate", { target_verification_code: code });
      if (queryError) throw queryError;
      return data?.[0] ?? null;
    },
  });

  return (
    <div className="min-h-screen bg-black text-white">
      <Navigation />
      <main className="container mx-auto px-4 py-24 flex justify-center">
        <Card className="glass-card border-white/10 max-w-xl w-full text-center">
          <CardHeader>
            <Award className="w-12 h-12 mx-auto mb-3" />
            <CardTitle className="text-2xl text-white">Verificação de certificado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading && <p className="text-gray-400">Consultando certificado...</p>}
            {error && <p className="text-red-400">Não foi possível verificar: {error.message}</p>}
            {!isLoading && !error && !data && <div className="text-red-400"><XCircle className="w-10 h-10 mx-auto mb-2" /><p>Certificado não encontrado.</p></div>}
            {data && <div className="space-y-4"><div className={data.valid ? "text-green-400" : "text-red-400"}>{data.valid ? <CheckCircle2 className="w-10 h-10 mx-auto mb-2" /> : <XCircle className="w-10 h-10 mx-auto mb-2" />}<p className="font-semibold">{data.valid ? "Certificado válido" : "Certificado revogado"}</p></div><div className="rounded-lg border border-white/10 p-4 text-left space-y-2 text-sm"><div><p className="text-gray-500">Aluno</p><p>{data.student_name}</p></div><div><p className="text-gray-500">Curso</p><p>{data.course_title}</p></div><div><p className="text-gray-500">Emissão</p><p>{formatDate(data.issued_at)}</p></div><div><p className="text-gray-500">Código</p><p className="font-mono break-all">{data.verification_code}</p></div></div></div>}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}

import { Award, ExternalLink, Loader2, Printer } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useMyCertificates } from "@/hooks/useCertificates";
import { getErrorMessage } from "@/lib/error-message";

const formatDate = (value: string): string =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));

const Certificates = () => {
  const certificatesQuery = useMyCertificates();

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-col gap-5 border-b border-white/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-gray-500">Portal do Aluno</p>
            <h1 className="mt-3 flex items-center gap-3 text-4xl font-bold">
              <Award className="h-9 w-9" />
              Meus certificados
            </h1>
            <p className="mt-3 max-w-2xl text-gray-400">
              Certificados emitidos e revogados permanecem disponíveis como histórico auditável.
            </p>
          </div>
          <Link to="/aluno">
            <Button variant="outline" className="border-white/20 bg-transparent">
              Voltar ao portal
            </Button>
          </Link>
        </header>

        {certificatesQuery.isLoading ? (
          <div className="flex min-h-64 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : certificatesQuery.error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-100">
            {getErrorMessage(certificatesQuery.error, "Não foi possível carregar os certificados.")}
          </div>
        ) : (certificatesQuery.data ?? []).length === 0 ? (
          <Card className="border-white/10 bg-white/5">
            <CardContent className="flex flex-col items-center px-6 py-14 text-center">
              <Award className="mb-4 h-12 w-12 text-gray-500" />
              <h2 className="text-xl font-semibold">Nenhum certificado emitido</h2>
              <p className="mt-2 max-w-xl text-sm text-gray-400">
                Quando os requisitos do curso forem atendidos e a emissão for registrada, o certificado aparecerá aqui.
              </p>
            </CardContent>
          </Card>
        ) : (
          <section className="grid gap-6 lg:grid-cols-2" aria-label="Certificados do aluno">
            {(certificatesQuery.data ?? []).map((certificate) => (
              <Card key={certificate.id} className="border-white/10 bg-white/5">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-xl text-white">{certificate.course_title}</CardTitle>
                      <CardDescription className="mt-2 text-gray-400">
                        Emitido para {certificate.student_name} em {formatDate(certificate.issued_at)}
                      </CardDescription>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        certificate.status === "issued"
                          ? "bg-emerald-500/15 text-emerald-200"
                          : "bg-red-500/15 text-red-200"
                      }`}
                    >
                      {certificate.status === "issued" ? "Válido" : "Revogado"}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-3 rounded-xl border border-white/10 bg-black/20 p-4 text-sm sm:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Código</p>
                      <p className="mt-1 break-all font-mono text-white">{certificate.code}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Conclusão registrada</p>
                      <p className="mt-1 text-white">{certificate.completion_percent}%</p>
                    </div>
                  </div>

                  {certificate.status === "revoked" ? (
                    <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">
                      <p className="font-semibold">Certificado revogado</p>
                      <p className="mt-1">{certificate.revocation_reason ?? "Motivo não informado."}</p>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-3">
                    <Link to={`/certificado/${certificate.code}`}>
                      <Button className="btn-brand">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Abrir validação pública
                      </Button>
                    </Link>
                    <Link to={`/certificado/${certificate.code}?imprimir=1`}>
                      <Button variant="outline" className="border-white/20 bg-transparent">
                        <Printer className="mr-2 h-4 w-4" />
                        Imprimir
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>
        )}
      </div>
    </main>
  );
};

export default Certificates;

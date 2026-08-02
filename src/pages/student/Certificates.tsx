import { Award, ExternalLink, Printer } from "lucide-react";
import { Link } from "react-router-dom";

import { StudentPortalPageFrame } from "@/components/student/StudentPortalPageFrame";
import { StudentSectionHeader } from "@/components/student/StudentPortalPrimitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageState } from "@/components/ui/page-state";
import { useMyCertificates } from "@/hooks/useCertificates";
import { formatAppDate } from "@/lib/date-time";
import { getErrorMessage } from "@/lib/error-message";

const formatDate = (value: string): string =>
  formatAppDate(value, { dateStyle: "long" });

const Certificates = () => {
  const certificatesQuery = useMyCertificates();

  return (
    <StudentPortalPageFrame>
      <div className="space-y-8">
        <StudentSectionHeader
          eyebrow="Certificação acadêmica"
          title="Meus certificados"
          description="Certificados emitidos e revogados permanecem disponíveis como histórico auditável."
          action={
            <Button asChild variant="outline">
              <Link to="/aluno">Voltar ao portal</Link>
            </Button>
          }
        />

        {certificatesQuery.isLoading ? (
          <PageState
            variant="loading"
            title="Carregando certificados"
            description="Consultando as emissões e revogações registradas."
          />
        ) : certificatesQuery.error ? (
          <PageState
            variant="error"
            title="Certificados indisponíveis"
            description={getErrorMessage(
              certificatesQuery.error,
              "Não foi possível carregar os certificados.",
            )}
          />
        ) : (certificatesQuery.data ?? []).length === 0 ? (
          <PageState
            variant="empty"
            icon={Award}
            title="Nenhum certificado emitido"
            description="Quando os requisitos do curso forem atendidos e a emissão for registrada, o certificado aparecerá aqui."
          />
        ) : (
          <section
            className="grid gap-6 lg:grid-cols-2"
            aria-label="Certificados do aluno"
          >
            {(certificatesQuery.data ?? []).map((certificate) => (
              <Card key={certificate.id} variant="course">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle>{certificate.course_title}</CardTitle>
                      <CardDescription className="mt-2">
                        Emitido para {certificate.student_name} em{" "}
                        {formatDate(certificate.issued_at)}
                      </CardDescription>
                    </div>
                    <Badge
                      variant={
                        certificate.status === "issued" ? "success" : "destructive"
                      }
                    >
                      {certificate.status === "issued" ? "Válido" : "Revogado"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="surface-muted grid gap-3 p-4 text-sm sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Código
                      </p>
                      <p className="mt-1 break-all font-mono text-foreground">
                        {certificate.code}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Conclusão registrada
                      </p>
                      <p className="mt-1 text-foreground">
                        {certificate.completion_percent}%
                      </p>
                    </div>
                  </div>

                  {certificate.status === "revoked" ? (
                    <PageState
                      variant="error"
                      compact
                      title="Certificado revogado"
                      description={
                        certificate.revocation_reason ?? "Motivo não informado."
                      }
                    />
                  ) : null}

                  <div className="flex flex-wrap gap-3">
                    <Button asChild variant="context">
                      <Link to={`/certificado/${certificate.code}`}>
                        <ExternalLink aria-hidden="true" />
                        Abrir validação pública
                      </Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link to={`/certificado/${certificate.code}?imprimir=1`}>
                        <Printer aria-hidden="true" />
                        Imprimir
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>
        )}
      </div>
    </StudentPortalPageFrame>
  );
};

export default Certificates;

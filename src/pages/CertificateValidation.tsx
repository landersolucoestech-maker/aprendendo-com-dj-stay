import {
  Award,
  CheckCircle2,
  Loader2,
  Printer,
  Search,
  XCircle,
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { brandConfig } from "@/config/brand";
import { useCertificateValidation } from "@/hooks/useCertificates";
import { formatAppDate } from "@/lib/date-time";
import { getErrorMessage } from "@/lib/error-message";

const certificateCodePattern = /^DJSTAY-[A-F0-9]{20}$/;
const normalizeCode = (value: string): string => value.trim().toUpperCase();

const formatDate = (value: string | null): string =>
  formatAppDate(value, { dateStyle: "long", fallback: "Não informado" });

const CertificateValidation = () => {
  const params = useParams<{ code?: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const code = normalizeCode(params.code ?? "");
  const [input, setInput] = useState(code);
  const validationQuery = useCertificateValidation(code);

  useEffect(() => {
    setInput(code);
  }, [code]);

  useEffect(() => {
    if (
      searchParams.get("imprimir") === "1" &&
      validationQuery.data?.found &&
      validationQuery.data.valid
    ) {
      window.print();
    }
  }, [searchParams, validationQuery.data]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = normalizeCode(input);
    if (certificateCodePattern.test(normalized)) {
      navigate(`/certificado/${normalized}`);
    }
  };

  const validFormat = certificateCodePattern.test(code);
  const validInputFormat = certificateCodePattern.test(input);
  const result = validationQuery.data;

  return (
    <main
      className="min-h-screen bg-background px-4 py-10 text-foreground print:bg-white print:text-black sm:px-6 lg:px-8"
      aria-busy={validationQuery.isLoading}
    >
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="text-center print:hidden">
          <Link
            to="/"
            className="rounded-sm text-sm uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground"
          >
            {brandConfig.name}
          </Link>
          <h1 className="mt-4 flex items-center justify-center gap-3 text-4xl font-bold">
            <Award className="h-9 w-9 text-brand-light" aria-hidden="true" />
            Validar certificado
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Consulte o código impresso no certificado. A validade é confirmada
            diretamente pelo registro oficial.
          </p>
        </header>

        <Card className="border-border bg-card print:hidden">
          <CardContent className="p-5">
            <form
              className="flex flex-col gap-3 sm:flex-row sm:items-start"
              onSubmit={submit}
              role="search"
              aria-describedby="certificate-code-format"
            >
              <div className="min-w-0 flex-1">
                <Label htmlFor="certificate-code" className="sr-only">
                  Código do certificado
                </Label>
                <Input
                  id="certificate-code"
                  value={input}
                  onChange={(event) => setInput(normalizeCode(event.target.value))}
                  placeholder="DJSTAY-00000000000000000000"
                  className="font-mono uppercase"
                  maxLength={27}
                  autoComplete="off"
                  spellCheck={false}
                  aria-invalid={input.length > 0 && !validInputFormat}
                  aria-describedby="certificate-code-format"
                />
                <p
                  id="certificate-code-format"
                  className="mt-2 text-xs text-muted-foreground"
                >
                  Formato: DJSTAY- seguido por 20 caracteres hexadecimais.
                </p>
              </div>
              <Button type="submit" variant="brand" disabled={!validInputFormat}>
                <Search className="h-4 w-4" aria-hidden="true" />
                Consultar
              </Button>
            </form>
          </CardContent>
        </Card>

        {!code ? null : !validFormat ? (
          <Card className="border-destructive/30 bg-destructive/10" role="alert">
            <CardContent className="flex items-start gap-4 p-6 text-destructive-foreground">
              <XCircle className="mt-0.5 h-6 w-6 shrink-0" aria-hidden="true" />
              <div>
                <h2 className="font-semibold">Código em formato inválido</h2>
                <p className="mt-1 text-sm">
                  Confira todos os caracteres e tente novamente.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : validationQuery.isLoading ? (
          <div
            className="flex min-h-64 items-center justify-center gap-3 rounded-2xl border border-border bg-card text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
            <span>Validando certificado...</span>
          </div>
        ) : validationQuery.error ? (
          <Card className="border-destructive/30 bg-destructive/10" role="alert">
            <CardContent className="p-6 text-destructive-foreground">
              {getErrorMessage(
                validationQuery.error,
                "Não foi possível validar o certificado.",
              )}
            </CardContent>
          </Card>
        ) : result && !result.found ? (
          <Card className="border-destructive/30 bg-destructive/10" role="status">
            <CardContent className="flex items-start gap-4 p-6 text-destructive-foreground">
              <XCircle className="mt-0.5 h-7 w-7 shrink-0" aria-hidden="true" />
              <div>
                <h2 className="text-xl font-semibold">Certificado não encontrado</h2>
                <p className="mt-2 text-sm">
                  Não existe registro oficial para o código informado.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : result?.found ? (
          <Card
            className="overflow-hidden border-border bg-card print:border-2 print:border-black print:bg-white"
            role="status"
            aria-live="polite"
          >
            <div
              className={`h-2 ${result.valid ? "bg-emerald-500" : "bg-destructive"}`}
              aria-hidden="true"
            />
            <CardHeader className="text-center print:pt-12">
              <div className="mx-auto mb-4 rounded-full border border-border bg-muted p-4 print:border-black print:bg-transparent">
                {result.valid ? (
                  <CheckCircle2
                    className="h-12 w-12 text-emerald-400 print:text-black"
                    aria-hidden="true"
                  />
                ) : (
                  <XCircle
                    className="h-12 w-12 text-destructive print:text-black"
                    aria-hidden="true"
                  />
                )}
              </div>
              <CardTitle className="text-3xl print:text-black">
                {result.valid ? "Certificado válido" : "Certificado revogado"}
              </CardTitle>
              <CardDescription className="text-muted-foreground print:text-black">
                Registro oficial do curso {brandConfig.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8 px-6 pb-8 sm:px-10 print:px-16 print:pb-16">
              <div className="text-center">
                <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground print:text-black">
                  Certificamos que
                </p>
                <p className="mt-3 text-3xl font-bold">{result.student_name}</p>
                <p className="mx-auto mt-4 max-w-2xl text-muted-foreground print:text-black">
                  concluiu o curso <strong>{result.course_title}</strong>, com{" "}
                  {result.completion_percent}% de conclusão registrada no momento da
                  emissão.
                </p>
              </div>

              <dl className="grid gap-4 rounded-2xl border border-border bg-background/40 p-5 text-sm print:border-black print:bg-transparent sm:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase tracking-[0.18em] text-muted-foreground print:text-black">
                    Código
                  </dt>
                  <dd className="mt-1 break-all font-mono">{result.code}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.18em] text-muted-foreground print:text-black">
                    Data de emissão
                  </dt>
                  <dd className="mt-1">{formatDate(result.issued_at)}</dd>
                </div>
              </dl>

              {!result.valid ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-5 text-destructive-foreground print:border-black print:bg-transparent print:text-black">
                  <p className="font-semibold">
                    Revogado em {formatDate(result.revoked_at)}
                  </p>
                  <p className="mt-1 text-sm">
                    {result.revocation_reason ?? "Motivo não informado."}
                  </p>
                </div>
              ) : null}

              {result.valid ? (
                <div className="flex justify-center print:hidden">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => window.print()}
                  >
                    <Printer className="h-4 w-4" aria-hidden="true" />
                    Imprimir certificado
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </main>
  );
};

export default CertificateValidation;

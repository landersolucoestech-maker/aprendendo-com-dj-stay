import { Award, CheckCircle2, Loader2, Printer, Search, XCircle } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCertificateValidation } from "@/hooks/useCertificates";
import { getErrorMessage } from "@/lib/error-message";

const normalizeCode = (value: string): string => value.trim().toUpperCase();

const formatDate = (value: string | null): string =>
  value === null
    ? "Não informado"
    : new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "long",
        timeZone: "America/Sao_Paulo",
      }).format(new Date(value));

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
    if (/^DJSTAY-[A-F0-9]{20}$/.test(normalized)) {
      navigate(`/certificado/${normalized}`);
    }
  };

  const validFormat = /^DJSTAY-[A-F0-9]{20}$/.test(code);
  const result = validationQuery.data;

  return (
    <main className="min-h-screen bg-black px-4 py-10 text-white print:bg-white print:text-black sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="text-center print:hidden">
          <Link to="/" className="text-sm uppercase tracking-[0.3em] text-gray-500">
            Aprendendo com DJ Stay
          </Link>
          <h1 className="mt-4 flex items-center justify-center gap-3 text-4xl font-bold">
            <Award className="h-9 w-9" />
            Validar certificado
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-gray-400">
            Consulte o código impresso no certificado. A validade é confirmada diretamente pelo registro oficial.
          </p>
        </header>

        <Card className="border-white/10 bg-white/5 print:hidden">
          <CardContent className="p-5">
            <form className="flex flex-col gap-3 sm:flex-row" onSubmit={submit}>
              <input
                value={input}
                onChange={(event) => setInput(normalizeCode(event.target.value))}
                placeholder="DJSTAY-00000000000000000000"
                aria-label="Código do certificado"
                className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/30 px-4 py-3 font-mono text-sm uppercase text-white outline-none focus:border-white/40"
                maxLength={27}
              />
              <Button type="submit" className="btn-brand" disabled={!/^DJSTAY-[A-F0-9]{20}$/.test(input)}>
                <Search className="mr-2 h-4 w-4" />
                Consultar
              </Button>
            </form>
          </CardContent>
        </Card>

        {!code ? null : !validFormat ? (
          <Card className="border-red-500/20 bg-red-500/10">
            <CardContent className="flex items-start gap-4 p-6 text-red-100">
              <XCircle className="mt-0.5 h-6 w-6 shrink-0" />
              <div>
                <h2 className="font-semibold">Código em formato inválido</h2>
                <p className="mt-1 text-sm text-red-200">Confira todos os caracteres e tente novamente.</p>
              </div>
            </CardContent>
          </Card>
        ) : validationQuery.isLoading ? (
          <div className="flex min-h-64 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : validationQuery.error ? (
          <Card className="border-red-500/20 bg-red-500/10">
            <CardContent className="p-6 text-red-100">
              {getErrorMessage(validationQuery.error, "Não foi possível validar o certificado.")}
            </CardContent>
          </Card>
        ) : result && !result.found ? (
          <Card className="border-red-500/20 bg-red-500/10">
            <CardContent className="flex items-start gap-4 p-6 text-red-100">
              <XCircle className="mt-0.5 h-7 w-7 shrink-0" />
              <div>
                <h2 className="text-xl font-semibold">Certificado não encontrado</h2>
                <p className="mt-2 text-sm text-red-200">Não existe registro oficial para o código informado.</p>
              </div>
            </CardContent>
          </Card>
        ) : result?.found ? (
          <Card className="overflow-hidden border-white/10 bg-white/5 print:border-2 print:border-black print:bg-white">
            <div className={`h-2 ${result.valid ? "bg-emerald-500" : "bg-red-500"}`} />
            <CardHeader className="text-center print:pt-12">
              <div className="mx-auto mb-4 rounded-full border border-white/10 bg-white/10 p-4 print:border-black print:bg-transparent">
                {result.valid ? (
                  <CheckCircle2 className="h-12 w-12 text-emerald-400 print:text-black" />
                ) : (
                  <XCircle className="h-12 w-12 text-red-400 print:text-black" />
                )}
              </div>
              <CardTitle className="text-3xl text-white print:text-black">
                {result.valid ? "Certificado válido" : "Certificado revogado"}
              </CardTitle>
              <CardDescription className="text-gray-400 print:text-black">
                Registro oficial do curso Aprendendo com DJ Stay
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8 px-6 pb-8 sm:px-10 print:px-16 print:pb-16">
              <div className="text-center">
                <p className="text-sm uppercase tracking-[0.25em] text-gray-500 print:text-black">Certificamos que</p>
                <p className="mt-3 text-3xl font-bold">{result.student_name}</p>
                <p className="mx-auto mt-4 max-w-2xl text-gray-300 print:text-black">
                  concluiu o curso <strong>{result.course_title}</strong>, com {result.completion_percent}% de conclusão registrada no momento da emissão.
                </p>
              </div>

              <div className="grid gap-4 rounded-2xl border border-white/10 bg-black/20 p-5 text-sm print:border-black print:bg-transparent sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-500 print:text-black">Código</p>
                  <p className="mt-1 break-all font-mono">{result.code}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-500 print:text-black">Data de emissão</p>
                  <p className="mt-1">{formatDate(result.issued_at)}</p>
                </div>
              </div>

              {!result.valid ? (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-5 text-red-100 print:border-black print:bg-transparent print:text-black">
                  <p className="font-semibold">Revogado em {formatDate(result.revoked_at)}</p>
                  <p className="mt-1 text-sm">{result.revocation_reason ?? "Motivo não informado."}</p>
                </div>
              ) : null}

              {result.valid ? (
                <div className="flex justify-center print:hidden">
                  <Button type="button" variant="outline" className="border-white/20 bg-transparent" onClick={() => window.print()}>
                    <Printer className="mr-2 h-4 w-4" />
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

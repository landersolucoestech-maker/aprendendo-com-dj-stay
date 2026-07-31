import { Award, BookOpenCheck, Loader2, Search, ShieldX, UserPlus, Users } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useGrantCourseEnrollment,
  useIssueEnrollmentCertificate,
  useRenewCourseEnrollment,
  useRevokeCourseEnrollment,
  useRevokeEnrollmentCertificate,
  useStudentsAdminDashboard,
  useSuspendCourseEnrollment,
} from "@/hooks/useCertificates";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/error-message";

const fieldClass =
  "w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-white/40";

const formatDateTime = (value: string | null): string =>
  value === null
    ? "Sem expiração"
    : new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "America/Sao_Paulo",
      }).format(new Date(value));

const toIso = (value: string): string | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const enrollmentStatusLabel: Record<string, string> = {
  pending: "Pendente",
  active: "Ativa",
  suspended: "Suspensa",
  revoked: "Revogada",
};

const StudentsAdmin = () => {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const dashboardQuery = useStudentsAdminDashboard(search);
  const grantEnrollment = useGrantCourseEnrollment();
  const renewEnrollment = useRenewCourseEnrollment();
  const suspendEnrollment = useSuspendCourseEnrollment();
  const revokeEnrollment = useRevokeCourseEnrollment();
  const issueCertificate = useIssueEnrollmentCertificate();
  const revokeCertificate = useRevokeEnrollmentCertificate();

  const [studentId, setStudentId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [grantReason, setGrantReason] = useState("Concessão administrativa registrada");
  const [actionReason, setActionReason] = useState("");
  const [renewalDate, setRenewalDate] = useState("");

  const data = dashboardQuery.data;
  const studentsById = useMemo(
    () => new Map((data?.students ?? []).map((student) => [student.user_id, student])),
    [data?.students],
  );

  const runAction = async (action: () => Promise<unknown>, successTitle: string) => {
    try {
      await action();
      toast({ title: successTitle });
    } catch (error: unknown) {
      toast({
        title: "Operação não concluída",
        description: getErrorMessage(error, "Revise os dados e tente novamente."),
        variant: "destructive",
      });
    }
  };

  const submitEnrollment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const startIso = startsAt ? toIso(startsAt) : new Date().toISOString();
    if (!studentId || !courseId || !startIso || grantReason.trim().length < 3) return;

    await runAction(
      () =>
        grantEnrollment.mutateAsync({
          userId: studentId,
          courseId,
          startsAt: startIso,
          expiresAt: toIso(expiresAt),
          reason: grantReason.trim(),
        }),
      "Matrícula concedida",
    );
  };

  const reasonReady = actionReason.trim().length >= 3;
  const anyPending =
    grantEnrollment.isPending ||
    renewEnrollment.isPending ||
    suspendEnrollment.isPending ||
    revokeEnrollment.isPending ||
    issueCertificate.isPending ||
    revokeCertificate.isPending;

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col gap-5 border-b border-white/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-gray-500">Administração</p>
            <h1 className="mt-3 flex items-center gap-3 text-4xl font-bold">
              <Users className="h-9 w-9" />
              Alunos, matrículas e certificados
            </h1>
            <p className="mt-3 max-w-3xl text-gray-400">
              Concessões, suspensões, revogações e emissões são executadas por RPC transacional e registradas no histórico.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/admin/cursos">
              <Button variant="outline" className="border-white/20 bg-transparent">Cursos</Button>
            </Link>
            <Link to="/admin/afiliados">
              <Button variant="outline" className="border-white/20 bg-transparent">Afiliados</Button>
            </Link>
          </div>
        </header>

        <Card className="border-white/10 bg-white/5">
          <CardContent className="p-5">
            <label className="relative block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                className={`${fieldClass} pl-10`}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar aluno por nome ou e-mail"
              />
            </label>
          </CardContent>
        </Card>

        {dashboardQuery.isLoading ? (
          <div className="flex min-h-64 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : dashboardQuery.error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-100">
            {getErrorMessage(dashboardQuery.error, "Não foi possível carregar a administração de alunos.")}
          </div>
        ) : data ? (
          <>
            <section className="grid gap-4 md:grid-cols-3">
              <Card className="border-white/10 bg-white/5"><CardContent className="p-5"><p className="text-sm text-gray-400">Alunos</p><p className="mt-1 text-3xl font-bold">{data.students.length}</p></CardContent></Card>
              <Card className="border-white/10 bg-white/5"><CardContent className="p-5"><p className="text-sm text-gray-400">Matrículas</p><p className="mt-1 text-3xl font-bold">{data.enrollments.length}</p></CardContent></Card>
              <Card className="border-white/10 bg-white/5"><CardContent className="p-5"><p className="text-sm text-gray-400">Certificados válidos</p><p className="mt-1 text-3xl font-bold">{data.certificates.filter((certificate) => certificate.status === "issued").length}</p></CardContent></Card>
            </section>

            <Card className="border-white/10 bg-white/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white"><UserPlus className="h-5 w-5" />Conceder matrícula</CardTitle>
                <CardDescription className="text-gray-400">A matrícula manual exige aluno, curso, início e motivo auditável.</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="grid gap-4 lg:grid-cols-3" onSubmit={(event) => void submitEnrollment(event)}>
                  <select className={fieldClass} value={studentId} onChange={(event) => setStudentId(event.target.value)} required>
                    <option value="">Selecione o aluno</option>
                    {data.students.map((student) => <option key={student.user_id} value={student.user_id}>{student.name} · {student.email}</option>)}
                  </select>
                  <select className={fieldClass} value={courseId} onChange={(event) => setCourseId(event.target.value)} required>
                    <option value="">Selecione o curso</option>
                    {data.courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
                  </select>
                  <input className={fieldClass} type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} aria-label="Início da matrícula" />
                  <input className={fieldClass} type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} aria-label="Expiração da matrícula" />
                  <input className={fieldClass} value={grantReason} onChange={(event) => setGrantReason(event.target.value)} minLength={3} maxLength={1000} placeholder="Motivo da concessão" required />
                  <Button type="submit" className="btn-brand" disabled={grantEnrollment.isPending}>
                    {grantEnrollment.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                    Conceder matrícula
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/5">
              <CardHeader>
                <CardTitle className="text-white">Parâmetros das ações</CardTitle>
                <CardDescription className="text-gray-400">Motivos são obrigatórios para suspensão, revogação e revogação de certificado.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <input className={fieldClass} value={actionReason} onChange={(event) => setActionReason(event.target.value)} minLength={3} maxLength={1000} placeholder="Motivo administrativo" />
                <input className={fieldClass} type="datetime-local" value={renewalDate} onChange={(event) => setRenewalDate(event.target.value)} aria-label="Nova data de expiração" />
              </CardContent>
            </Card>

            <section className="space-y-4">
              <div><h2 className="text-2xl font-bold">Matrículas</h2><p className="mt-1 text-sm text-gray-400">Conclusão e elegibilidade são calculadas no servidor.</p></div>
              {data.enrollments.length === 0 ? (
                <Card className="border-white/10 bg-white/5"><CardContent className="p-8 text-center text-gray-400">Nenhuma matrícula encontrada.</CardContent></Card>
              ) : data.enrollments.map((enrollment) => {
                const student = studentsById.get(enrollment.user_id);
                return (
                  <Card key={enrollment.id} className="border-white/10 bg-white/5">
                    <CardContent className="space-y-5 p-5">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <h3 className="text-lg font-semibold">{student?.name ?? enrollment.user_id}</h3>
                          <p className="mt-1 text-sm text-gray-400">{enrollment.course_title} · {enrollmentStatusLabel[enrollment.status] ?? enrollment.status}</p>
                          <p className="mt-1 text-xs text-gray-500">Início: {formatDateTime(enrollment.starts_at)} · Expiração: {formatDateTime(enrollment.expires_at)}</p>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm">
                          <p>{enrollment.completion.completed_lessons}/{enrollment.completion.total_lessons} aulas</p>
                          <p className="mt-1 font-semibold">{enrollment.completion.completion_percent}% concluído</p>
                          <p className={enrollment.completion.eligible ? "mt-1 text-emerald-300" : "mt-1 text-amber-300"}>{enrollment.completion.eligible ? "Elegível para certificado" : "Requisitos pendentes"}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {enrollment.status === "active" ? (
                          <Button type="button" variant="outline" className="border-white/20 bg-transparent" disabled={!reasonReady || anyPending} onClick={() => void runAction(() => suspendEnrollment.mutateAsync({ enrollmentId: enrollment.id, reason: actionReason.trim() }), "Matrícula suspensa")}>Suspender</Button>
                        ) : null}
                        {enrollment.status !== "revoked" ? (
                          <Button type="button" variant="outline" className="border-red-500/30 bg-transparent text-red-200" disabled={!reasonReady || anyPending} onClick={() => void runAction(() => revokeEnrollment.mutateAsync({ enrollmentId: enrollment.id, reason: actionReason.trim() }), "Matrícula revogada")}><ShieldX className="mr-2 h-4 w-4" />Revogar matrícula</Button>
                        ) : null}
                        <Button type="button" variant="outline" className="border-white/20 bg-transparent" disabled={!toIso(renewalDate) || anyPending} onClick={() => { const value=toIso(renewalDate); if (value) void runAction(() => renewEnrollment.mutateAsync({ enrollmentId: enrollment.id, expiresAt: value }), "Matrícula renovada"); }}>Renovar acesso</Button>
                        {!enrollment.active_certificate_id ? (
                          <Button type="button" className="btn-brand" disabled={!enrollment.completion.eligible || anyPending} onClick={() => void runAction(() => issueCertificate.mutateAsync(enrollment.id), "Certificado emitido")}><Award className="mr-2 h-4 w-4" />Emitir certificado</Button>
                        ) : (
                          <Link to={`/certificado/${enrollment.active_certificate_code}`}><Button variant="outline" className="border-emerald-500/30 bg-transparent text-emerald-200"><BookOpenCheck className="mr-2 h-4 w-4" />{enrollment.active_certificate_code}</Button></Link>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </section>

            <section className="space-y-4">
              <div><h2 className="text-2xl font-bold">Histórico de certificados</h2><p className="mt-1 text-sm text-gray-400">Registros revogados não são apagados.</p></div>
              {data.certificates.map((certificate) => (
                <Card key={certificate.id} className="border-white/10 bg-white/5">
                  <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="font-semibold">{certificate.student_name} · {certificate.course_title}</p>
                      <p className="mt-1 font-mono text-sm text-gray-400">{certificate.code}</p>
                      <p className="mt-1 text-xs text-gray-500">Emitido em {formatDateTime(certificate.issued_at)} · {certificate.status === "issued" ? "Válido" : `Revogado: ${certificate.revocation_reason ?? "sem motivo"}`}</p>
                    </div>
                    <div className="flex gap-2">
                      <Link to={`/certificado/${certificate.code}`}><Button variant="outline" className="border-white/20 bg-transparent">Consultar</Button></Link>
                      {certificate.status === "issued" ? (
                        <Button type="button" variant="outline" className="border-red-500/30 bg-transparent text-red-200" disabled={!reasonReady || anyPending} onClick={() => void runAction(() => revokeCertificate.mutateAsync({ certificateId: certificate.id, reason: actionReason.trim() }), "Certificado revogado")}>Revogar certificado</Button>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
};

export default StudentsAdmin;

import {
  Banknote,
  BookOpen,
  Boxes,
  GraduationCap,
  LayoutDashboard,
  LifeBuoy,
  Mail,
  ReceiptText,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";

import { CheckoutCronHealthCard } from "@/components/admin/CheckoutCronHealthCard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageState } from "@/components/ui/page-state";
import { useContactMessagesAdmin } from "@/hooks/useContactMessages";
import { useAdminCourses } from "@/hooks/useCourseCms";
import { useStudentsAdminDashboard } from "@/hooks/useCertificates";
import { useMarketplaceAdminProducts } from "@/hooks/useDigitalMarketplace";
import { usePaymentAdminDashboard } from "@/hooks/usePaymentAdmin";
import { useSupportAdminDashboard } from "@/hooks/useSupportTickets";
import { buildAdminOverview } from "@/lib/admin-overview";
import { getErrorMessage } from "@/lib/error-message";

const formatMoney = (amountCents: number): string =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amountCents / 100);

const MetricCard = ({
  title,
  value,
  detail,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  detail: string;
  icon: LucideIcon;
}) => (
  <Card className="border-white/10 bg-white/5">
    <CardContent className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-gray-400">{title}</p>
          <p className="mt-2 text-3xl font-bold text-white">{value}</p>
          <p className="mt-2 text-xs leading-5 text-gray-500">{detail}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/30 p-3">
          <Icon className="h-5 w-5 text-purple-200" aria-hidden="true" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const AdminDashboard = () => {
  const paymentsQuery = usePaymentAdminDashboard({
    status: null,
    subjectType: null,
    search: "",
    page: 0,
    pageSize: 5,
  });
  const studentsQuery = useStudentsAdminDashboard({
    search: "",
    studentLimit: 1,
    studentOffset: 0,
    enrollmentLimit: 1,
    enrollmentOffset: 0,
    certificateLimit: 1,
    certificateOffset: 0,
  });
  const coursesQuery = useAdminCourses();
  const productsQuery = useMarketplaceAdminProducts();
  const supportQuery = useSupportAdminDashboard({ limit: 5, offset: 0 });
  const contactsQuery = useContactMessagesAdmin({
    status: null,
    search: "",
    limit: 5,
    offset: 0,
  });

  const isLoading =
    paymentsQuery.isLoading ||
    studentsQuery.isLoading ||
    coursesQuery.isLoading ||
    productsQuery.isLoading ||
    supportQuery.isLoading ||
    contactsQuery.isLoading;
  const error =
    paymentsQuery.error ??
    studentsQuery.error ??
    coursesQuery.error ??
    productsQuery.error ??
    supportQuery.error ??
    contactsQuery.error;

  if (isLoading) {
    return (
      <main className="min-h-screen bg-black px-4 py-8 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <PageState
            variant="loading"
            title="Carregando visão administrativa"
            description="Consolidando os read models financeiros, acadêmicos e operacionais."
          />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-black px-4 py-8 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <PageState
            variant="error"
            title="Visão administrativa indisponível"
            description={getErrorMessage(
              error,
              "Não foi possível consolidar os indicadores administrativos.",
            )}
          />
        </div>
      </main>
    );
  }

  const payments = paymentsQuery.data;
  const students = studentsQuery.data;
  const courses = coursesQuery.data;
  const products = productsQuery.data;
  const support = supportQuery.data;
  const contacts = contactsQuery.data;

  if (!payments || !students || !courses || !products || !support || !contacts) {
    return (
      <main className="min-h-screen bg-black px-4 py-8 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <PageState
            variant="empty"
            title="Indicadores ainda não consolidados"
            description="Os domínios administrativos não retornaram um snapshot completo."
          />
        </div>
      </main>
    );
  }

  const overview = buildAdminOverview({
    payments,
    students,
    courses,
    products,
    support,
    contacts,
  });

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col gap-5 border-b border-white/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-gray-500">
              Administração do proprietário
            </p>
            <h1 className="mt-3 flex items-center gap-3 text-4xl font-bold">
              <LayoutDashboard className="h-9 w-9" aria-hidden="true" />
              Visão geral
            </h1>
            <p className="mt-3 max-w-3xl text-gray-400">
              Indicadores consolidados diretamente dos domínios persistidos. Nenhum
              valor desta página é estimado ou preenchido com dados de exemplo.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline" className="border-white/20 bg-transparent">
              <Link to="/admin/pagamentos">Abrir financeiro</Link>
            </Button>
            <Button asChild className="btn-brand">
              <Link to="/admin/alunos">Gerenciar alunos</Link>
            </Button>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores principais">
          <MetricCard
            title="Valor confirmado"
            value={formatMoney(overview.finance.confirmedAmountCents)}
            detail={`${overview.finance.paidOrders} pedido(s) atualmente pago(s)`}
            icon={Banknote}
          />
          <MetricCard
            title="Alunos"
            value={overview.academic.totalStudents}
            detail={`${overview.academic.totalEnrollments} matrícula(s) persistida(s)`}
            icon={GraduationCap}
          />
          <MetricCard
            title="Certificados válidos"
            value={overview.academic.validCertificates}
            detail={`${overview.academic.totalCertificates} certificado(s) no histórico`}
            icon={ShieldCheck}
          />
          <MetricCard
            title="Fila operacional"
            value={overview.operations.operationalQueue}
            detail="Pagamentos pendentes, suporte aguardando e novos contatos"
            icon={ReceiptText}
          />
        </section>

        <section aria-label="Saúde da automação de checkout">
          <CheckoutCronHealthCard />
        </section>

        <section className="grid gap-6 xl:grid-cols-3" aria-label="Resumo por domínio">
          <Card className="border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Banknote className="h-5 w-5" aria-hidden="true" /> Financeiro
              </CardTitle>
              <CardDescription className="text-gray-400">
                Valores persistidos no read model de pedidos e pagamentos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex justify-between gap-4"><span className="text-gray-400">Pedidos totais</span><strong>{overview.finance.totalOrders}</strong></div>
              <div className="flex justify-between gap-4"><span className="text-gray-400">Pendentes</span><strong>{overview.finance.pendingOrders}</strong></div>
              <div className="flex justify-between gap-4"><span className="text-gray-400">Reembolsado</span><strong>{formatMoney(overview.finance.refundedAmountCents)}</strong></div>
              <div className="flex justify-between gap-4"><span className="text-gray-400">Chargeback perdido</span><strong>{formatMoney(overview.finance.chargebackLostAmountCents)}</strong></div>
              <Button asChild variant="outline" className="w-full border-white/20 bg-transparent">
                <Link to="/admin/pagamentos">Ver pedidos e pagamentos</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <BookOpen className="h-5 w-5" aria-hidden="true" /> Acadêmico
              </CardTitle>
              <CardDescription className="text-gray-400">
                Totais persistidos de alunos, matrículas e certificados.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex justify-between gap-4"><span className="text-gray-400">Alunos</span><strong>{overview.academic.totalStudents}</strong></div>
              <div className="flex justify-between gap-4"><span className="text-gray-400">Matrículas</span><strong>{overview.academic.totalEnrollments}</strong></div>
              <div className="flex justify-between gap-4"><span className="text-gray-400">Certificados no histórico</span><strong>{overview.academic.totalCertificates}</strong></div>
              <div className="flex justify-between gap-4"><span className="text-gray-400">Certificados válidos</span><strong>{overview.academic.validCertificates}</strong></div>
              <Button asChild variant="outline" className="w-full border-white/20 bg-transparent">
                <Link to="/admin/alunos">Ver alunos e matrículas</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Boxes className="h-5 w-5" aria-hidden="true" /> Catálogo
              </CardTitle>
              <CardDescription className="text-gray-400">
                Ciclo editorial real de cursos e produtos digitais.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex justify-between gap-4"><span className="text-gray-400">Cursos publicados</span><strong>{overview.catalogue.publishedCourses}/{overview.catalogue.totalCourses}</strong></div>
              <div className="flex justify-between gap-4"><span className="text-gray-400">Cursos em rascunho</span><strong>{overview.catalogue.draftCourses}</strong></div>
              <div className="flex justify-between gap-4"><span className="text-gray-400">Produtos publicados</span><strong>{overview.catalogue.publishedProducts}/{overview.catalogue.totalProducts}</strong></div>
              <div className="flex justify-between gap-4"><span className="text-gray-400">Produtos em rascunho</span><strong>{overview.catalogue.draftProducts}</strong></div>
              <div className="grid grid-cols-2 gap-2">
                <Button asChild variant="outline" className="border-white/20 bg-transparent">
                  <Link to="/admin/cursos">Cursos</Link>
                </Button>
                <Button asChild variant="outline" className="border-white/20 bg-transparent">
                  <Link to="/admin/produtos">Produtos</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-2" aria-label="Filas operacionais">
          <Card className="border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <LifeBuoy className="h-5 w-5" aria-hidden="true" /> Suporte
              </CardTitle>
              <CardDescription className="text-gray-400">
                Tickets que exigem acompanhamento do proprietário.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-2xl font-bold">{overview.operations.awaitingSupport}</p><p className="mt-1 text-xs text-gray-500">Aguardando suporte</p></div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-2xl font-bold">{overview.operations.awaitingStudent}</p><p className="mt-1 text-xs text-gray-500">Aguardando aluno</p></div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-2xl font-bold">{overview.operations.urgentSupport}</p><p className="mt-1 text-xs text-gray-500">Urgentes</p></div>
              </div>
              <Button asChild variant="outline" className="w-full border-white/20 bg-transparent">
                <Link to="/admin/suporte">Abrir suporte</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Mail className="h-5 w-5" aria-hidden="true" /> Contatos
              </CardTitle>
              <CardDescription className="text-gray-400">
                Solicitações recebidas pelo formulário público.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-2xl font-bold">{overview.operations.newContacts}</p><p className="mt-1 text-xs text-gray-500">Novos</p></div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-2xl font-bold">{overview.operations.contactsInProgress}</p><p className="mt-1 text-xs text-gray-500">Em andamento</p></div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-2xl font-bold">{overview.operations.resolvedContacts}</p><p className="mt-1 text-xs text-gray-500">Resolvidos</p></div>
              </div>
              <Button asChild variant="outline" className="w-full border-white/20 bg-transparent">
                <Link to="/admin/contatos">Abrir contatos</Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
};

export default AdminDashboard;

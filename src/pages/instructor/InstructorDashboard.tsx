import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, CircleDollarSign, Headphones, ShoppingCart, TrendingUp, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import MetricCard from "@/components/instructor/MetricCard";
import { useInstructorMetrics } from "@/hooks/useInstructorData";
import { formatCurrency } from "@/lib/platform";

export default function InstructorDashboard() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState("30");
  const range = useMemo(() => {
    const to = new Date();
    const from = new Date(to);
    from.setDate(from.getDate() - Number(period));
    return { from, to };
  }, [period]);
  const { data, isLoading, error } = useInstructorMetrics(range.from, range.to);

  return (
    <div className="p-5 md:p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-sm text-gray-400">Operação educacional e comercial</p>
          <h1 className="text-3xl font-bold gradient-text">Dashboard do instrutor</h1>
        </div>
        <div className="flex gap-2">
          <select value={period} onChange={(event) => setPeriod(event.target.value)} className="h-10 rounded-md border border-white/20 bg-black px-3 text-sm">
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="90">Últimos 90 dias</option>
          </select>
          <Button onClick={() => navigate("/instrutor/cursos/novo")}>Criar curso</Button>
        </div>
      </div>

      {isLoading && <p className="text-gray-400">Carregando indicadores...</p>}
      {error && <p className="text-red-400">Não foi possível carregar os indicadores: {error.message}</p>}

      {data && (
        <>
          <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <MetricCard label="Faturamento bruto" value={formatCurrency(data.gross_revenue_cents)} helper={`${data.sales_count} vendas no período`} icon={CircleDollarSign} />
            <MetricCard label="Alunos" value={data.total_students} helper={`${data.new_students} novos no período`} icon={Users} />
            <MetricCard label="Ticket médio" value={formatCurrency(data.average_ticket_cents)} helper="Pedidos pagos" icon={TrendingUp} />
            <MetricCard label="Progresso médio" value={`${Number(data.average_progress).toFixed(1)}%`} helper={`${data.completed_enrollments} conclusões`} icon={BookOpen} />
          </section>

          <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <MetricCard label="Cursos publicados" value={`${data.published_courses}/${data.courses_count}`} icon={BookOpen} />
            <MetricCard label="Carrinhos abandonados" value={data.abandoned_carts} icon={ShoppingCart} />
            <MetricCard label="Atendimentos abertos" value={data.open_tickets} helper={`${data.urgent_tickets} urgentes`} icon={Headphones} />
            <MetricCard label="Novos alunos" value={data.new_students} icon={UserPlus} />
          </section>
        </>
      )}

      <Card className="glass-card border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Ações operacionais</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
          <Button variant="outline" className="border-white/20 bg-transparent justify-start" onClick={() => navigate("/instrutor/cursos")}>Gerenciar cursos</Button>
          <Button variant="outline" className="border-white/20 bg-transparent justify-start" onClick={() => navigate("/instrutor/alunos")}>Consultar alunos</Button>
          <Button variant="outline" className="border-white/20 bg-transparent justify-start" onClick={() => navigate("/instrutor/vendas")}>Acompanhar vendas</Button>
          <Button variant="outline" className="border-white/20 bg-transparent justify-start" onClick={() => navigate("/instrutor/atendimento")}>Atender solicitações</Button>
        </CardContent>
      </Card>
    </div>
  );
}

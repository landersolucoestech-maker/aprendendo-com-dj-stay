import { Search, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useInstructorStudents } from "@/hooks/useInstructorData";
import { formatDate } from "@/lib/platform";

export default function InstructorStudents() {
  const { data: students, isLoading, error } = useInstructorStudents();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const filtered = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return (students ?? []).filter((item: any) => {
      const matchesSearch = !normalized
        || String(item.profiles?.full_name ?? "").toLowerCase().includes(normalized)
        || String(item.courses?.title ?? "").toLowerCase().includes(normalized);
      const matchesStatus = status === "all" || item.status === status;
      return matchesSearch && matchesStatus;
    });
  }, [search, status, students]);

  return (
    <div className="p-5 md:p-8 space-y-6">
      <div>
        <p className="text-sm text-gray-400">Matrículas e desempenho</p>
        <h1 className="text-3xl font-bold gradient-text">Alunos</h1>
      </div>

      <div className="grid md:grid-cols-[1fr_220px] gap-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por aluno ou curso" />
        </div>
        <select className="h-10 rounded-md border border-white/20 bg-black px-3" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="all">Todos os status</option>
          <option value="active">Ativos</option>
          <option value="completed">Concluídos</option>
          <option value="suspended">Suspensos</option>
          <option value="revoked">Revogados</option>
          <option value="refunded">Reembolsados</option>
        </select>
      </div>

      {isLoading && <p className="text-gray-400">Carregando alunos...</p>}
      {error && <p className="text-red-400">{error.message}</p>}
      {!isLoading && filtered.length === 0 && (
        <Card className="glass-card border-white/10"><CardContent className="p-10 text-center"><Users className="w-10 h-10 mx-auto text-gray-500 mb-3" /><p>Nenhum aluno encontrado.</p></CardContent></Card>
      )}

      <div className="grid gap-3">
        {filtered.map((item: any) => (
          <Card key={item.id} className="glass-card border-white/10">
            <CardContent className="p-5 grid lg:grid-cols-[1.1fr_1.2fr_1fr_180px] gap-5 items-center">
              <div>
                <p className="font-semibold">{item.profiles?.full_name || "Aluno sem nome"}</p>
                <p className="text-sm text-gray-500">Matrícula em {formatDate(item.enrolled_at)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Curso</p>
                <p>{item.courses?.title || "Curso indisponível"}</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm"><span className="text-gray-400">Progresso</span><span>{Number(item.progress_percent).toFixed(1)}%</span></div>
                <Progress value={Number(item.progress_percent)} />
              </div>
              <div className="lg:text-right">
                <span className="inline-flex rounded-full bg-white/10 px-2.5 py-1 text-xs">{item.status}</span>
                <p className="text-xs text-gray-500 mt-2">Último acesso: {formatDate(item.last_accessed_at)}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

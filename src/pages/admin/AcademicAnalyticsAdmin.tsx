import { GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";

import { AcademicAnalyticsCard } from "@/components/admin/AcademicAnalyticsCard";
import { Button } from "@/components/ui/button";

const AcademicAnalyticsAdmin = () => (
  <main className="min-h-screen bg-black px-4 py-8 text-white sm:px-6 lg:px-8">
    <div className="mx-auto max-w-7xl space-y-8">
      <header className="flex flex-col gap-5 border-b border-white/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-gray-500">
            Administração acadêmica
          </p>
          <h1 className="mt-3 flex items-center gap-3 text-4xl font-bold">
            <GraduationCap className="h-9 w-9" aria-hidden="true" />
            Analytics acadêmico
          </h1>
          <p className="mt-3 max-w-3xl text-gray-400">
            Coortes de matrícula, conclusão das aulas publicadas e sinais operacionais
            de inatividade derivados exclusivamente dos registros persistidos.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline" className="border-white/20 bg-transparent">
            <Link to="/admin/alunos">Gerenciar alunos</Link>
          </Button>
          <Button asChild variant="outline" className="border-white/20 bg-transparent">
            <Link to="/admin/cursos">Gerenciar cursos</Link>
          </Button>
        </div>
      </header>

      <AcademicAnalyticsCard />
    </div>
  </main>
);

export default AcademicAnalyticsAdmin;

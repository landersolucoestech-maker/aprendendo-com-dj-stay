import {
  BadgeCheck,
  LifeBuoy,
  LockKeyhole,
  TrendingUp,
} from "lucide-react";
import { Link } from "react-router";

import { Button } from "@/components/ui/button";

const capabilities = [
  {
    title: "Progresso persistido",
    description:
      "Aulas concluídas, percentual e retomada são registrados no portal do aluno.",
    icon: TrendingUp,
  },
  {
    title: "Suporte rastreável",
    description:
      "Solicitações do aluno recebem protocolo, histórico de mensagens e estado de atendimento.",
    icon: LifeBuoy,
  },
  {
    title: "Certificados verificáveis",
    description:
      "Certificados emitidos possuem código próprio e consulta pública de validade.",
    icon: BadgeCheck,
  },
  {
    title: "Acesso protegido",
    description:
      "Cursos, arquivos e reprodução privada respeitam matrícula, sessão e permissões persistidas.",
    icon: LockKeyhole,
  },
] as const;

const OperationalTrustSection = () => (
  <section
    id="transparencia"
    className="relative bg-gradient-to-br from-black via-brand-dark/20 to-black py-20"
  >
    <div className="container mx-auto px-4">
      <div className="mb-14 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-light">
          Transparência operacional
        </p>
        <h2 className="mt-4 text-4xl font-bold md:text-5xl">
          <span className="gradient-text">O que a plataforma comprova</span>
        </h2>
        <p className="mx-auto mt-5 max-w-3xl text-xl text-gray-300">
          Esta página não publica números de alunos, avaliações, resultados ou depoimentos sem uma fonte persistida e auditável.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {capabilities.map(({ title, description, icon: Icon }) => (
          <article key={title} className="glass-card p-6">
            <div className="inline-flex rounded-xl border border-white/10 bg-black/30 p-3">
              <Icon className="h-6 w-6 text-brand-light" aria-hidden="true" />
            </div>
            <h3 className="mt-5 text-xl font-semibold text-white">{title}</h3>
            <p className="mt-3 leading-7 text-gray-400">{description}</p>
          </article>
        ))}
      </div>

      <div className="glass-card mx-auto mt-12 max-w-3xl p-8 text-center">
        <h3 className="text-2xl font-bold text-white">
          Consulte antes de se matricular
        </h3>
        <p className="mt-3 text-gray-300">
          Use o canal de contato para esclarecer conteúdo, acesso, pagamento ou suporte. Certificados já emitidos podem ser validados publicamente pelo código.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild variant="outline" className="border-white/20 bg-transparent">
            <Link to="/contato">Abrir contato</Link>
          </Button>
          <Button asChild variant="outline" className="border-white/20 bg-transparent">
            <Link to="/certificado">Validar certificado</Link>
          </Button>
          <Button asChild className="btn-brand">
            <Link to="/matricule-se">Criar conta</Link>
          </Button>
        </div>
      </div>
    </div>
  </section>
);

export default OperationalTrustSection;

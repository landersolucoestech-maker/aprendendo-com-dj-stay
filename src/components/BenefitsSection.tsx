import {
  BadgeCheck,
  BookOpen,
  Download,
  LifeBuoy,
  LockKeyhole,
  TrendingUp,
} from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";

const capabilities = [
  {
    icon: BookOpen,
    title: "Cursos estruturados",
    description:
      "A oferta pública reflete os cursos, módulos e aulas efetivamente publicados no CMS.",
  },
  {
    icon: TrendingUp,
    title: "Progresso individual",
    description:
      "O portal registra conclusão, percentual e retomada das aulas vinculadas à matrícula.",
  },
  {
    icon: Download,
    title: "Materiais protegidos",
    description:
      "Arquivos vinculados às aulas são entregues somente quando existe acesso autorizado.",
  },
  {
    icon: LifeBuoy,
    title: "Canal de suporte",
    description:
      "Alunos podem abrir tickets, acompanhar o estado e manter o histórico de mensagens.",
  },
  {
    icon: BadgeCheck,
    title: "Certificado configurável",
    description:
      "Quando habilitado no curso, o certificado segue as regras persistidas de conclusão e possui validação pública.",
  },
  {
    icon: LockKeyhole,
    title: "Conta e permissões",
    description:
      "Sessão, papel do usuário e matrícula controlam o acesso às áreas privadas da plataforma.",
  },
] as const;

const BenefitsSection = () => (
  <section className="relative bg-black/50 py-20">
    <div className="container mx-auto px-4">
      <div className="mb-16 text-center">
        <h2 className="mb-6 text-4xl font-bold md:text-5xl">
          <span className="gradient-text">Recursos da plataforma</span>
        </h2>
        <p className="mx-auto max-w-3xl text-xl text-gray-300">
          Funcionalidades já implementadas e condicionadas ao conteúdo e às regras cadastradas pelo instrutor.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {capabilities.map(({ icon: Icon, title, description }) => (
          <article
            key={title}
            className="glass-card p-6 transition-all duration-300 hover:brand-border"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-brand">
              <Icon className="h-6 w-6 text-white" aria-hidden="true" />
            </div>
            <h3 className="mt-4 text-xl font-bold text-white">{title}</h3>
            <p className="mt-3 leading-relaxed text-gray-300">{description}</p>
          </article>
        ))}
      </div>

      <div className="mx-auto mt-16 max-w-2xl text-center">
        <div className="glass-card p-8">
          <h3 className="text-2xl font-bold text-white">
            Consulte a oferta disponível
          </h3>
          <p className="mt-4 text-gray-300">
            Preço, duração, currículo e certificado podem variar por curso e são exibidos conforme o cadastro publicado.
          </p>
          <Button asChild className="btn-brand mt-6">
            <a href="#curso">Ver cursos publicados</a>
          </Button>
          <Button asChild variant="ghost" className="mt-3 sm:ml-3 sm:mt-6">
            <Link to="/contato">Tirar uma dúvida</Link>
          </Button>
        </div>
      </div>
    </div>
  </section>
);

export default BenefitsSection;

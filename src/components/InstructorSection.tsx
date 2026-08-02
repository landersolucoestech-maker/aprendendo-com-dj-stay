import { BookOpen, CircleHelp, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { brandConfig } from "@/config/brand";

const InstructorSection = () => (
  <section
    id="instrutor"
    className="relative bg-gradient-to-br from-black via-brand-dark to-black py-20"
  >
    <div className="container mx-auto px-4">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div className="glass-card p-6">
          <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-gradient-brand p-10">
            <img
              src={brandConfig.logoPath}
              alt={brandConfig.logoAlt}
              className="h-full w-full object-contain"
            />
          </div>
        </div>

        <div className="space-y-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-light">
              Instrutor responsável
            </p>
            <h2 className="mt-4 text-4xl font-bold md:text-5xl">
              Conteúdo publicado por <span className="gradient-text">DJ Stay</span>
            </h2>
            <p className="mt-6 text-xl leading-relaxed text-gray-300">
              DJ Stay é o instrutor responsável pela curadoria e publicação dos cursos exibidos nesta plataforma.
            </p>
            <p className="mt-4 leading-7 text-gray-400">
              A apresentação pública não exibe tempo de carreira, streams, rankings, artistas parceiros ou outros números enquanto essas informações não existirem em uma fonte editorial validada.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="glass-card p-4">
              <BookOpen className="h-7 w-7 text-brand-light" aria-hidden="true" />
              <h3 className="mt-3 font-semibold text-white">Currículo no CMS</h3>
              <p className="mt-2 text-sm text-gray-400">
                A estrutura apresentada ao público vem dos módulos publicados.
              </p>
            </div>
            <div className="glass-card p-4">
              <ShieldCheck className="h-7 w-7 text-brand-medium" aria-hidden="true" />
              <h3 className="mt-3 font-semibold text-white">Acesso controlado</h3>
              <p className="mt-2 text-sm text-gray-400">
                O portal respeita conta, papel e matrícula persistidos.
              </p>
            </div>
            <div className="glass-card p-4">
              <CircleHelp className="h-7 w-7 text-brand-light" aria-hidden="true" />
              <h3 className="mt-3 font-semibold text-white">Dúvidas antes da compra</h3>
              <p className="mt-2 text-sm text-gray-400">
                O formulário público registra a solicitação com protocolo.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild className="btn-brand">
              <a href="#curso">Ver cursos publicados</a>
            </Button>
            <Button asChild variant="outline" className="border-white/20 bg-transparent">
              <Link to="/contato">Falar com a plataforma</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default InstructorSection;

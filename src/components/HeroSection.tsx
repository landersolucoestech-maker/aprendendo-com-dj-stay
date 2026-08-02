import {
  BookOpen,
  Clock,
  GraduationCap,
  Layers3,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import type { PublicCourse } from "@/contracts/public-course-catalog";
import { usePublicCourseCatalog } from "@/hooks/usePublicCourseCatalog";

const levelLabel: Record<PublicCourse["level"], string> = {
  beginner: "Iniciante",
  intermediate: "Intermediário",
  advanced: "Avançado",
  all_levels: "Todos os níveis",
};

const formatDuration = (minutes: number): string => {
  if (minutes <= 0) return "Duração em atualização";

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) return `${remainingMinutes} min`;
  if (remainingMinutes === 0) return `${hours} h`;
  return `${hours} h ${remainingMinutes} min`;
};

const formatMoney = (value: number, currencyCode: string): string =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currencyCode,
  }).format(value);

const HeroSection = () => {
  const catalogQuery = usePublicCourseCatalog();
  const featuredCourse = catalogQuery.data?.courses[0];
  const primaryPath = featuredCourse
    ? `/cursos?curso=${encodeURIComponent(featuredCourse.slug)}`
    : "/matricule-se";

  return (
    <section
      id="home"
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-black via-brand-dark to-black"
    >
      <div className="absolute inset-0 opacity-10">
        <div
          className="h-full w-full bg-repeat"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2338b6ff' fill-opacity='0.4'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
          }}
        />
      </div>

      <div className="container relative z-10 mx-auto px-4 py-28">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="space-y-8 text-center lg:text-left">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-brand-light/20 px-4 py-2">
                <Sparkles className="h-4 w-4 text-brand-light" aria-hidden="true" />
                <span className="text-sm text-gray-300">
                  Conteúdo publicado pelo instrutor
                </span>
              </div>

              <h1 className="text-4xl font-black leading-tight md:text-6xl lg:text-7xl">
                <span className="gradient-text animate-glow">
                  {featuredCourse?.title ?? "Formação musical prática"}
                </span>
              </h1>

              <p className="mx-auto max-w-2xl text-xl text-gray-300 lg:mx-0">
                {featuredCourse?.short_description ??
                  (catalogQuery.isError
                    ? "O catálogo público está temporariamente indisponível. O acesso à conta e ao suporte continua disponível."
                    : "Os cursos publicados aparecerão aqui automaticamente assim que estiverem disponíveis no catálogo.")}
              </p>
            </div>

            {featuredCourse ? (
              <div className="flex flex-wrap justify-center gap-6 lg:justify-start">
                <div className="flex items-center gap-2 text-gray-300">
                  <Layers3 className="h-5 w-5 text-brand-light" aria-hidden="true" />
                  <span>{featuredCourse.module_count} módulo(s)</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <BookOpen className="h-5 w-5 text-brand-medium" aria-hidden="true" />
                  <span>{featuredCourse.lesson_count} aula(s) publicada(s)</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <Clock className="h-5 w-5 text-brand-light" aria-hidden="true" />
                  <span>{formatDuration(featuredCourse.duration_minutes)}</span>
                </div>
              </div>
            ) : null}

            <div className="flex flex-col justify-center gap-4 sm:flex-row lg:justify-start">
              <Button asChild size="lg" className="btn-brand px-8 py-6 text-lg">
                <Link to={primaryPath}>
                  {featuredCourse ? "Comprar curso" : "Criar conta"}
                  <GraduationCap className="ml-2 h-5 w-5" aria-hidden="true" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-brand-light/20 bg-transparent px-8 py-6 text-lg text-brand-light hover:bg-brand-light/10"
              >
                <a href="#curso">Ver catálogo publicado</a>
              </Button>
            </div>
          </div>

          <div className="glass-card p-6 sm:p-8">
            {catalogQuery.isLoading ? (
              <div className="space-y-4" aria-live="polite">
                <p className="text-sm uppercase tracking-[0.25em] text-gray-500">
                  Catálogo
                </p>
                <h2 className="text-2xl font-bold text-white">
                  Carregando conteúdo publicado
                </h2>
                <p className="text-gray-400">
                  Consultando a oferta persistida no ambiente da plataforma.
                </p>
              </div>
            ) : featuredCourse ? (
              <div className="space-y-6">
                <div>
                  <p className="text-sm uppercase tracking-[0.25em] text-brand-light">
                    {featuredCourse.category} · {levelLabel[featuredCourse.level]}
                  </p>
                  <h2 className="mt-3 text-3xl font-bold text-white">
                    {formatMoney(
                      featuredCourse.effective_price_amount,
                      featuredCourse.currency_code,
                    )}
                  </h2>
                  {featuredCourse.promotion_active ? (
                    <p className="mt-1 text-sm text-gray-400">
                      Preço normal: {formatMoney(
                        featuredCourse.price_amount,
                        featuredCourse.currency_code,
                      )}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-white">Objetivos publicados</h3>
                  <ul className="space-y-2 text-sm text-gray-300">
                    {featuredCourse.objectives.slice(0, 4).map((objective) => (
                      <li key={objective} className="flex gap-3">
                        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-light" />
                        <span>{objective}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <p className="text-sm text-gray-400">
                  {featuredCourse.preview_lesson_count > 0
                    ? `${featuredCourse.preview_lesson_count} aula(s) estão marcadas como prévia no currículo.`
                    : "Nenhuma aula está marcada como prévia neste momento."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm uppercase tracking-[0.25em] text-gray-500">
                  Catálogo
                </p>
                <h2 className="text-2xl font-bold text-white">
                  Nenhum curso disponível agora
                </h2>
                <p className="text-gray-400">
                  Somente ofertas publicadas e dentro da janela de disponibilidade são exibidas.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;

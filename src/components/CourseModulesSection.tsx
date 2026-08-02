import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Clock,
  Eye,
  GraduationCap,
} from "lucide-react";
import { useState } from "react";
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
  if (minutes <= 0) return "Duração não informada";

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

const CourseModulesSection = () => {
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const catalogQuery = usePublicCourseCatalog();
  const courses = catalogQuery.data?.courses ?? [];

  return (
    <section id="curso" className="relative bg-black/30 py-20">
      <div className="container mx-auto px-4">
        <div className="mb-16 text-center">
          <h2 className="mb-6 text-4xl font-bold md:text-5xl">
            <span className="gradient-text">Catálogo publicado</span>
          </h2>
          <p className="mx-auto max-w-3xl text-xl text-gray-300">
            Cursos, preços e estrutura curricular exibidos diretamente do CMS da plataforma.
          </p>
        </div>

        {catalogQuery.isLoading ? (
          <div className="glass-card mx-auto max-w-3xl p-8 text-center" aria-live="polite">
            <h3 className="text-xl font-semibold text-white">Carregando catálogo</h3>
            <p className="mt-2 text-gray-400">
              Consultando cursos e módulos publicados.
            </p>
          </div>
        ) : catalogQuery.isError ? (
          <div className="glass-card mx-auto max-w-3xl p-8 text-center" role="status">
            <h3 className="text-xl font-semibold text-white">
              Catálogo temporariamente indisponível
            </h3>
            <p className="mt-2 text-gray-400">
              A conta, o portal e o canal de contato permanecem acessíveis.
            </p>
            <Button asChild className="btn-brand mt-6">
              <Link to="/contato">Falar com o suporte</Link>
            </Button>
          </div>
        ) : courses.length === 0 ? (
          <div className="glass-card mx-auto max-w-3xl p-8 text-center">
            <h3 className="text-xl font-semibold text-white">
              Nenhum curso disponível neste momento
            </h3>
            <p className="mt-2 text-gray-400">
              A vitrine mostra apenas cursos publicados e dentro da janela de disponibilidade.
            </p>
          </div>
        ) : (
          <div className="mx-auto max-w-5xl space-y-6">
            {courses.map((course) => {
              const isExpanded = expandedCourse === course.slug;

              return (
                <article key={course.slug} className="glass-card overflow-hidden">
                  <div className="p-6 sm:p-8">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                      <div className="max-w-3xl">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-light">
                          {course.category} · {levelLabel[course.level]}
                        </p>
                        <h3 className="mt-3 text-3xl font-bold text-white">
                          {course.title}
                        </h3>
                        <p className="mt-3 leading-7 text-gray-300">
                          {course.short_description}
                        </p>
                      </div>

                      <div className="min-w-52 rounded-2xl border border-white/10 bg-black/25 p-5 text-left lg:text-right">
                        <p className="text-sm text-gray-400">Investimento atual</p>
                        <p className="mt-1 text-3xl font-bold text-white">
                          {formatMoney(
                            course.effective_price_amount,
                            course.currency_code,
                          )}
                        </p>
                        {course.promotion_active ? (
                          <p className="mt-1 text-sm text-gray-500 line-through">
                            {formatMoney(course.price_amount, course.currency_code)}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                        <BookOpen className="h-5 w-5 text-brand-light" aria-hidden="true" />
                        <p className="mt-2 text-2xl font-bold text-white">
                          {course.module_count}
                        </p>
                        <p className="text-sm text-gray-400">módulo(s)</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                        <GraduationCap className="h-5 w-5 text-brand-medium" aria-hidden="true" />
                        <p className="mt-2 text-2xl font-bold text-white">
                          {course.lesson_count}
                        </p>
                        <p className="text-sm text-gray-400">aula(s) publicada(s)</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                        <Clock className="h-5 w-5 text-brand-light" aria-hidden="true" />
                        <p className="mt-2 text-lg font-bold text-white">
                          {formatDuration(course.duration_minutes)}
                        </p>
                        <p className="text-sm text-gray-400">duração registrada</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                        <Eye className="h-5 w-5 text-brand-medium" aria-hidden="true" />
                        <p className="mt-2 text-2xl font-bold text-white">
                          {course.preview_lesson_count}
                        </p>
                        <p className="text-sm text-gray-400">prévia(s) marcada(s)</p>
                      </div>
                    </div>

                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                      <Button
                        type="button"
                        variant="outline"
                        className="border-white/20 bg-transparent text-white"
                        onClick={() =>
                          setExpandedCourse(isExpanded ? null : course.slug)
                        }
                        aria-expanded={isExpanded}
                        aria-controls={`course-${course.slug}-curriculum`}
                      >
                        {isExpanded ? (
                          <ChevronUp className="mr-2 h-4 w-4" aria-hidden="true" />
                        ) : (
                          <ChevronDown className="mr-2 h-4 w-4" aria-hidden="true" />
                        )}
                        {isExpanded ? "Ocultar currículo" : "Ver currículo publicado"}
                      </Button>
                      <Button asChild className="btn-brand">
                        <Link to="/matricule-se">Criar conta para continuar</Link>
                      </Button>
                    </div>
                  </div>

                  {isExpanded ? (
                    <div
                      id={`course-${course.slug}-curriculum`}
                      className="border-t border-white/10 bg-black/20 px-6 py-6 sm:px-8"
                    >
                      <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
                        <div>
                          <h4 className="text-xl font-semibold text-white">
                            Módulos publicados
                          </h4>
                          {course.modules.length === 0 ? (
                            <p className="mt-3 text-gray-400">
                              O curso está publicado, mas ainda não possui módulos públicos.
                            </p>
                          ) : (
                            <div className="mt-4 space-y-3">
                              {course.modules.map((moduleRecord) => (
                                <div
                                  key={`${moduleRecord.position}-${moduleRecord.title}`}
                                  className="rounded-xl border border-white/10 bg-white/5 p-4"
                                >
                                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-light">
                                        Módulo {moduleRecord.position + 1}
                                      </p>
                                      <h5 className="mt-1 font-semibold text-white">
                                        {moduleRecord.title}
                                      </h5>
                                      {moduleRecord.description ? (
                                        <p className="mt-2 text-sm leading-6 text-gray-400">
                                          {moduleRecord.description}
                                        </p>
                                      ) : null}
                                    </div>
                                    <div className="shrink-0 text-sm text-gray-400 sm:text-right">
                                      <p>{moduleRecord.lesson_count} aula(s)</p>
                                      <p>{formatDuration(moduleRecord.duration_minutes)}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div>
                          <h4 className="text-xl font-semibold text-white">
                            Objetivos publicados
                          </h4>
                          <ul className="mt-4 space-y-3 text-sm text-gray-300">
                            {course.objectives.map((objective) => (
                              <li key={objective} className="flex gap-3">
                                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-light" />
                                <span>{objective}</span>
                              </li>
                            ))}
                          </ul>

                          <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-gray-400">
                            <p>
                              {course.access_duration_days === null
                                ? "O prazo de acesso não está limitado no cadastro atual."
                                : `Prazo de acesso cadastrado: ${course.access_duration_days} dia(s).`}
                            </p>
                            <p className="mt-2">
                              {course.certificate_enabled
                                ? "O curso está configurado para emissão de certificado conforme as regras de conclusão."
                                : "Este curso não está configurado para emissão de certificado."}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default CourseModulesSection;

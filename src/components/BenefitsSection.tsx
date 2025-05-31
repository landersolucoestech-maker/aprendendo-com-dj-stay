
import { Music, Headphones, Download, Users, Zap, Trophy } from "lucide-react";

const benefits = [
  {
    icon: Music,
    title: "Samples Exclusivos",
    description: "Kit com +500 samples profissionais de funk, loops e one-shots prontos para usar"
  },
  {
    icon: Headphones,
    title: "Aulas Práticas",
    description: "Aprenda fazendo! Cada aula inclui projetos práticos do zero ao hit completo"
  },
  {
    icon: Download,
    title: "Materiais Extras",
    description: "Flps, presets, templates e recursos para acelerar sua produção musical"
  },
  {
    icon: Users,
    title: "Comunidade VIP",
    description: "Acesso ao grupo exclusivo com outros produtores e networking"
  },
  {
    icon: Zap,
    title: "Suporte Direto",
    description: "Tire suas dúvidas diretamente com o instrutor e tenha feedback dos seus beats"
  },
  {
    icon: Trophy,
    title: "Certificado",
    description: "Certificado de conclusão reconhecido no mercado musical"
  }
];

const BenefitsSection = () => {
  return (
    <section className="py-20 bg-black/50 relative">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="gradient-text">O que você vai receber</span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Um curso completo com tudo que você precisa para se tornar um produtor profissional de funk
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {benefits.map((benefit, index) => (
            <div 
              key={index} 
              className="glass-card p-6 group hover:brand-border transition-all duration-300 hover:scale-105"
            >
              <div className="w-12 h-12 bg-gradient-brand rounded-lg flex items-center justify-center mb-4 group-hover:animate-pulse">
                <benefit.icon className="w-6 h-6 text-white" />
              </div>
              
              <h3 className="text-xl font-bold text-white mb-3">
                {benefit.title}
              </h3>
              
              <p className="text-gray-300 leading-relaxed">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>

        {/* CTA at the bottom */}
        <div className="text-center mt-16">
          <div className="glass-card p-8 max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold text-white mb-4">
              Pronto para começar sua jornada?
            </h3>
            <p className="text-gray-300 mb-6">
              Junte-se a mais de 2.500 alunos que já estão produzindo hits de funk
            </p>
            <button className="btn-brand">
              Quero me matricular agora
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;

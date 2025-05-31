
import { useState } from 'react';
import { ChevronDown, ChevronUp, Play, Clock, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

const modules = [
  {
    title: "Módulo 1: Fundamentos da Produção Musical",
    duration: "4h 30min",
    lessons: 12,
    description: "Aprenda os conceitos básicos de produção musical, teoria musical aplicada ao funk e configuração do seu home studio.",
    topics: [
      "Introdução à produção musical",
      "Configuração de DAW (FL Studio/Ableton)",
      "Teoria musical básica para funk",
      "Estrutura de uma música de funk",
      "Equipamentos necessários"
    ]
  },
  {
    title: "Módulo 2: Criação de Beats e Ritmos",
    duration: "6h 15min", 
    lessons: 18,
    description: "Domine a criação de beats de funk, padrões rítmicos e programação de bateria que fazem o sucesso do gênero.",
    topics: [
      "Padrões rítmicos do funk carioca",
      "Programação de kick e snare",
      "Criação de grooves únicos",
      "Uso de samples de bateria",
      "Técnicas de swing e humanização"
    ]
  },
  {
    title: "Módulo 3: Baixo e Linhas de Base",
    duration: "5h 45min",
    lessons: 15,
    description: "Aprenda a criar linhas de baixo marcantes e como usar sintetizadores para conseguir aquele som grave característico.",
    topics: [
      "Síntese de baixo para funk",
      "Padrões de baixo tradicionais", 
      "Efeitos e processamento de baixo",
      "Layers de graves e sub-bass",
      "Sidechaining e compressão"
    ]
  },
  {
    title: "Módulo 4: Melodias e Harmonias",
    duration: "4h 20min",
    lessons: 14,
    description: "Desenvolva melodias cativantes, use samples criativamente e crie arranjos que prendem a atenção do ouvinte.",
    topics: [
      "Criação de melodias marcantes",
      "Uso criativo de samples",
      "Chopping e manipulação de samples",
      "Camadas melódicas",
      "Harmonia aplicada ao funk"
    ]
  },
  {
    title: "Módulo 5: Mixagem e Masterização", 
    duration: "7h 10min",
    lessons: 20,
    description: "Deixe suas produções com qualidade profissional através de técnicas avançadas de mixagem e masterização.",
    topics: [
      "EQ e frequências no funk",
      "Compressão dinâmica",
      "Efeitos espaciais (reverb/delay)",
      "Automação e movimento",
      "Masterização final"
    ]
  },
  {
    title: "Módulo 6: Produção Avançada e Mercado",
    duration: "3h 40min",
    lessons: 10,
    description: "Técnicas avançadas de produção, como vender suas beats e se posicionar no mercado musical.",
    topics: [
      "Técnicas de produção avançada",
      "Como vender suas beats",
      "Direitos autorais e licenciamento",
      "Marketing para produtores",
      "Networking no meio musical"
    ]
  }
];

const CourseModulesSection = () => {
  const [expandedModule, setExpandedModule] = useState<number | null>(null);

  const toggleModule = (index: number) => {
    setExpandedModule(expandedModule === index ? null : index);
  };

  const totalDuration = modules.reduce((total, module) => {
    const [hours, minutes] = module.duration.split('h ');
    return total + parseInt(hours) + parseInt(minutes.replace('min', '')) / 60;
  }, 0);

  const totalLessons = modules.reduce((total, module) => total + module.lessons, 0);

  return (
    <section id="curso" className="py-20 bg-black/30 relative">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="gradient-text">Conteúdo do Curso</span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
            6 módulos completos que vão do básico ao avançado, com foco total na prática
          </p>
          
          <div className="flex flex-wrap gap-8 justify-center mb-8">
            <div className="glass-card px-6 py-3">
              <div className="text-2xl font-bold text-brand-light">{Math.floor(totalDuration)}h+</div>
              <div className="text-sm text-gray-400">de conteúdo</div>
            </div>
            <div className="glass-card px-6 py-3">
              <div className="text-2xl font-bold text-brand-medium">{totalLessons}</div>
              <div className="text-sm text-gray-400">aulas práticas</div>
            </div>
            <div className="glass-card px-6 py-3">
              <div className="text-2xl font-bold text-brand-dark">500+</div>
              <div className="text-sm text-gray-400">samples exclusivos</div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto space-y-4">
          {modules.map((module, index) => (
            <div key={index} className="glass-card overflow-hidden">
              <button
                onClick={() => toggleModule(index)}
                className="w-full p-6 text-left flex items-center justify-between hover:bg-white/5 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-4 mb-2">
                    <span className="text-sm text-brand-light font-semibold">
                      MÓDULO {index + 1}
                    </span>
                    <div className="flex items-center text-gray-400 text-sm space-x-4">
                      <span className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {module.duration}
                      </span>
                      <span className="flex items-center">
                        <Play className="w-4 h-4 mr-1" />
                        {module.lessons} aulas
                      </span>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    {module.title}
                  </h3>
                  <p className="text-gray-300">
                    {module.description}
                  </p>
                </div>
                <div className="ml-4">
                  {expandedModule === index ? (
                    <ChevronUp className="w-6 h-6 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-6 h-6 text-gray-400" />
                  )}
                </div>
              </button>

              {expandedModule === index && (
                <div className="px-6 pb-6 border-t border-white/10">
                  <div className="pt-6">
                    <h4 className="text-lg font-semibold text-white mb-4">
                      O que você vai aprender:
                    </h4>
                    <ul className="space-y-3">
                      {module.topics.map((topic, topicIndex) => (
                        <li key={topicIndex} className="flex items-center text-gray-300">
                          <div className="w-2 h-2 bg-brand-light rounded-full mr-3 flex-shrink-0"></div>
                          {topic}
                        </li>
                      ))}
                    </ul>
                    
                    <div className="flex flex-wrap gap-4 mt-6 pt-6 border-t border-white/10">
                      <Button variant="outline" size="sm" className="border-brand-light/50 text-brand-light">
                        <Play className="w-4 h-4 mr-2" />
                        Aula gratuita
                      </Button>
                      <Button variant="outline" size="sm" className="border-brand-medium/50 text-brand-medium">
                        <Download className="w-4 h-4 mr-2" />
                        Materiais extras
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="text-center mt-16">
          <div className="glass-card p-8 max-w-2xl mx-auto brand-border">
            <h3 className="text-2xl font-bold text-white mb-4">
              Pronto para dominar a produção de funk?
            </h3>
            <p className="text-gray-300 mb-6">
              Acesso vitalício a todo o conteúdo + materiais extras + suporte direto
            </p>
            <Button size="lg" className="btn-brand text-lg px-8 py-4">
              Matricular agora por R$ 297
            </Button>
            <p className="text-sm text-gray-400 mt-3">
              ou 12x de R$ 29,70 no cartão
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CourseModulesSection;


import { Button } from "@/components/ui/button";
import { Play, Star, Users, Clock } from "lucide-react";

const HeroSection = () => {
  return (
    <section id="home" className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-dark">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%238B5CF6" fill-opacity="0.05"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]"></div>
      
      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          
          {/* Content */}
          <div className="text-center lg:text-left space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center space-x-2 bg-neon-purple/20 px-4 py-2 rounded-full">
                <Star className="w-4 h-4 text-neon-purple" />
                <span className="text-sm text-gray-300">Curso #1 em Produção de Funk</span>
              </div>
              
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-black leading-tight">
                <span className="gradient-text animate-glow">Produção de Funk</span>
                <br />
                <span className="text-white">na Prática</span>
              </h1>
              
              <p className="text-xl text-gray-300 max-w-2xl">
                Aprenda a produzir os hits do funk carioca com técnicas profissionais, 
                samples exclusivos e aulas práticas do zero ao avançado.
              </p>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-6 justify-center lg:justify-start">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-neon-purple" />
                <span className="text-gray-300">+2.500 alunos</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-neon-blue" />
                <span className="text-gray-300">50+ horas de conteúdo</span>
              </div>
              <div className="flex items-center space-x-2">
                <Star className="w-5 h-5 text-neon-pink" />
                <span className="text-gray-300">4.9/5 estrelas</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button size="lg" className="btn-neon text-lg px-8 py-6">
                Começar Agora
                <Play className="w-5 h-5 ml-2" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="text-lg px-8 py-6 border-white/20 bg-transparent hover:bg-white/10"
              >
                Assistir Prévia
              </Button>
            </div>
          </div>

          {/* Video/Image */}
          <div className="relative">
            <div className="glass-card p-4 animate-float">
              <div className="aspect-video bg-gradient-neon rounded-lg flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-black/50"></div>
                <Button 
                  size="lg" 
                  className="relative z-10 bg-white/20 hover:bg-white/30 text-white border-white/30"
                >
                  <Play className="w-8 h-8" />
                </Button>
                
                {/* Fake video overlay */}
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="bg-black/60 rounded px-3 py-2">
                    <p className="text-white text-sm font-medium">
                      Preview: Criando seu primeiro beat de funk
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Floating elements */}
            <div className="absolute -top-4 -right-4 glass-card p-3 animate-float" style={{animationDelay: '1s'}}>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-gray-300">Ao vivo</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;

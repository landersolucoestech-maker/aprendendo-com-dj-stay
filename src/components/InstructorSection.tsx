import { Music, Users, Award, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
const InstructorSection = () => {
  return <section id="instrutor" className="py-20 bg-gradient-to-br from-black via-brand-dark to-black relative">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          
          {/* Instructor Image */}
          <div className="relative">
            <div className="glass-card p-6">
              <div className="aspect-square bg-gradient-brand rounded-xl overflow-hidden relative">
                <img src="/placeholder.svg" alt="DJ Producer" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                
                {/* Floating achievements */}
                <div className="absolute top-4 right-4 glass-card p-3">
                  <div className="flex items-center space-x-2">
                    <Award className="w-5 h-5 text-yellow-400" />
                    <span className="text-white text-sm font-semibold">+15 anos</span>
                  </div>
                </div>
                
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="text-2xl font-bold text-white mb-1">DJ Stay</h3>
                  <p className="text-gray-300">Dj e Produtor Musical</p>
                </div>
              </div>
            </div>

            {/* Floating stats */}
            <div className="absolute -bottom-6 -right-6 glass-card p-4 animate-float" style={{
            animationDelay: '0.5s'
          }}>
              <div className="text-center">
                <div className="text-2xl font-bold text-brand-light">500M+</div>
                <div className="text-xs text-gray-400">Streams</div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-8">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Conheça seu <span className="gradient-text">instrutor</span>
              </h2>
              <p className="text-xl text-gray-300 leading-relaxed mb-6">DJ Stay é uma referência na produção de funk brasileiro, com mais de 15 anos de experiência e parcerias com os maiores nomes do cenário nacional.</p>
              <p className="text-gray-300 leading-relaxed">
                Suas produções já alcançaram mais de 500 milhões de streams nas plataformas digitais, 
                e agora ele compartilha todos os seus segredos e técnicas neste curso exclusivo.
              </p>
            </div>

            {/* Achievements */}
            <div className="grid grid-cols-2 gap-4">
              <div className="glass-card p-4 text-center">
                <Music className="w-8 h-8 text-brand-light mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">200+</div>
                <div className="text-sm text-gray-400">Hits produzidos</div>
              </div>
              
              <div className="glass-card p-4 text-center">
                <Users className="w-8 h-8 text-brand-medium mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">50+</div>
                <div className="text-sm text-gray-400">Artistas parceiros</div>
              </div>
              
              <div className="glass-card p-4 text-center">
                <Award className="w-8 h-8 text-brand-dark mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">15</div>
                <div className="text-sm text-gray-400">Anos de experiência</div>
              </div>
              
              <div className="glass-card p-4 text-center">
                <TrendingUp className="w-8 h-8 text-brand-light mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">Top 1</div>
                <div className="text-sm text-gray-400">Charts nacionais</div>
              </div>
            </div>

            {/* Quote */}
            <div className="glass-card p-6 brand-border">
              <blockquote className="text-lg text-gray-300 italic mb-4">
                "Minha missão é democratizar a produção musical e mostrar que qualquer pessoa 
                pode criar hits incríveis, independente do equipamento que tem em casa."
              </blockquote>
              <cite className="text-brand-light font-semibold">— DJ Stay</cite>
            </div>

            {/* Collaborations */}
            <div>
              <h4 className="text-xl font-bold text-white mb-4">
                Já trabalhou com:
              </h4>
              <div className="flex flex-wrap gap-2">
                {["MC Kevinho", "MC Hariel", "MC Ryan SP", "MC Davi", "Funk Brasil", "GR6 Music"].map((artist, index) => <span key={index} className="bg-white/10 text-gray-300 px-3 py-1 rounded-full text-sm">
                    {artist}
                  </span>)}
              </div>
            </div>

            <Button size="lg" className="btn-brand">
              Aprender com o Alex
            </Button>
          </div>
        </div>
      </div>
    </section>;
};
export default InstructorSection;
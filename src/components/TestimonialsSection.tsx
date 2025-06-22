import { Star, Play, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
const testimonials = [{
  name: "MC Kevinho",
  role: "Artista e Produtor",
  image: "/placeholder.svg",
  rating: 5,
  text: "Curso incrível! Aprendi técnicas que uso até hoje nas minhas produções. O método é muito didático e prático.",
  hasVideo: true
}, {
  name: "DJ Polyvox",
  role: "Produtor Musical",
  image: "/placeholder.svg",
  rating: 5,
  text: "Os samples são de qualidade profissional e as aulas são muito bem explicadas. Recomendo para quem quer entrar no funk de verdade.",
  hasVideo: false
}, {
  name: "Beatmaker Rafa",
  role: "Producer",
  image: "/placeholder.svg",
  rating: 5,
  text: "Em 3 meses consegui lançar meu primeiro EP graças ao que aprendi no curso. Valeu cada centavo investido!",
  hasVideo: true
}];
const TestimonialsSection = () => {
  return <section id="depoimentos" className="py-20 bg-gradient-to-br from-black via-brand-dark/20 to-black relative">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="gradient-text">O que os alunos dizem</span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Depoimentos reais de quem já transformou sua paixão em profissão
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {testimonials.map((testimonial, index) => <div key={index} className="glass-card p-6 group hover:brand-border transition-all duration-300">
              <div className="flex items-center mb-4">
                <img src={testimonial.image} alt={testimonial.name} className="w-12 h-12 rounded-full mr-4 bg-gradient-brand" />
                <div>
                  <h4 className="font-semibold text-white">{testimonial.name}</h4>
                  <p className="text-sm text-gray-400">{testimonial.role}</p>
                </div>
              </div>

              <div className="flex mb-3">
                {[...Array(testimonial.rating)].map((_, i) => <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)}
              </div>

              <Quote className="w-6 h-6 text-brand-light mb-3 opacity-50" />
              
              <p className="text-gray-300 leading-relaxed mb-4">
                {testimonial.text}
              </p>

              {testimonial.hasVideo && <Button variant="outline" size="sm" className="border-brand-light/50 text-brand-light hover:bg-brand-light/20">
                  <Play className="w-4 h-4 mr-2" />
                  Ver vídeo
                </Button>}
            </div>)}
        </div>

        {/* Featured Video Testimonial */}
        <div className="max-w-4xl mx-auto">
          <div className="glass-card p-8 text-center">
            <h3 className="text-2xl font-bold text-white mb-4">Veja o depoimento completo do DJ Lael</h3>
            
            <div className="aspect-video bg-gradient-brand rounded-lg flex items-center justify-center relative overflow-hidden mb-6">
              <div className="absolute inset-0 bg-black/50"></div>
              <Button size="lg" className="relative z-10 bg-white/20 hover:bg-white/30 text-white border-white/30">
                <Play className="w-8 h-8" />
              </Button>
              
              <div className="absolute bottom-4 left-4 right-4">
                <div className="bg-black/60 rounded px-3 py-2 text-left">
                  <p className="text-white text-sm font-medium">
                    "Como o curso mudou minha carreira no funk"
                  </p>
                  <p className="text-gray-300 text-xs">MC Kevinho - 3:42</p>
                </div>
              </div>
            </div>

            <p className="text-gray-300 mb-6">
              "Este curso não só me ensinou a produzir, mas me deu uma nova perspectiva sobre o funk brasileiro. 
              Hoje sou referência no segmento."
            </p>
            
            <Button className="btn-brand">
              Eu também quero esse resultado
            </Button>
          </div>
        </div>
      </div>
    </section>;
};
export default TestimonialsSection;
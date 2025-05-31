
import { Play, Mail, Phone, Instagram, Youtube } from "lucide-react";

const Footer = () => {
  return (
    <footer id="contato" className="bg-black border-t border-white/10">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          
          {/* Logo and Description */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-brand rounded-lg flex items-center justify-center">
                <Play className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold gradient-text">
                Produção de Funk
              </span>
            </div>
            <p className="text-gray-400">
              A melhor plataforma para aprender produção de funk do zero ao profissional.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-brand-light transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-brand-light transition-colors">
                <Youtube className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Course Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Curso</h4>
            <ul className="space-y-2">
              <li><a href="#curso" className="text-gray-400 hover:text-brand-light transition-colors">Módulos</a></li>
              <li><a href="#instrutor" className="text-gray-400 hover:text-brand-light transition-colors">Instrutor</a></li>
              <li><a href="#depoimentos" className="text-gray-400 hover:text-brand-light transition-colors">Depoimentos</a></li>
              <li><a href="#" className="text-gray-400 hover:text-brand-light transition-colors">Área do Aluno</a></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-white font-semibold mb-4">Suporte</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-brand-light transition-colors">FAQ</a></li>
              <li><a href="#contato" className="text-gray-400 hover:text-brand-light transition-colors">Contato</a></li>
              <li><a href="#" className="text-gray-400 hover:text-brand-light transition-colors">WhatsApp</a></li>
              <li><a href="#" className="text-gray-400 hover:text-brand-light transition-colors">Certificado</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold mb-4">Contato</h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-gray-400">
                <Mail className="w-4 h-4" />
                <span>contato@producaodefunk.com</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-400">
                <Phone className="w-4 h-4" />
                <span>(11) 99999-9999</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm">
            © 2024 Produção de Funk na Prática. Todos os direitos reservados.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="#" className="text-gray-400 hover:text-brand-light text-sm transition-colors">
              Política de Privacidade
            </a>
            <a href="#" className="text-gray-400 hover:text-brand-light text-sm transition-colors">
              Termos de Uso
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

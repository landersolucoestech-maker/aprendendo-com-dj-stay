
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Menu, X, Play, User, BookOpen, Phone } from "lucide-react";

const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <nav className="fixed top-0 w-full z-50 bg-black/90 backdrop-blur-lg border-b border-white/10">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-neon rounded-lg flex items-center justify-center">
              <Play className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">
              Produção de Funk
            </span>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="#home" className="text-gray-300 hover:text-white transition-colors">
              Início
            </a>
            <a href="#curso" className="text-gray-300 hover:text-white transition-colors">
              O Curso
            </a>
            <a href="#instrutor" className="text-gray-300 hover:text-white transition-colors">
              Instrutor
            </a>
            <a href="#depoimentos" className="text-gray-300 hover:text-white transition-colors">
              Depoimentos
            </a>
            <a href="#contato" className="text-gray-300 hover:text-white transition-colors">
              Contato
            </a>
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <Button variant="ghost" className="text-gray-300 hover:text-white">
              <User className="w-4 h-4 mr-2" />
              Entrar
            </Button>
            <Button className="btn-neon">
              Matricule-se
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMenu}
            className="md:hidden text-white p-2"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden glass-card mt-2 p-4 space-y-4">
            <a href="#home" className="block text-gray-300 hover:text-white transition-colors py-2">
              Início
            </a>
            <a href="#curso" className="block text-gray-300 hover:text-white transition-colors py-2">
              O Curso
            </a>
            <a href="#instrutor" className="block text-gray-300 hover:text-white transition-colors py-2">
              Instrutor
            </a>
            <a href="#depoimentos" className="block text-gray-300 hover:text-white transition-colors py-2">
              Depoimentos
            </a>
            <a href="#contato" className="block text-gray-300 hover:text-white transition-colors py-2">
              Contato
            </a>
            <div className="pt-4 border-t border-white/10 space-y-3">
              <Button variant="ghost" className="w-full justify-start text-gray-300">
                <User className="w-4 h-4 mr-2" />
                Entrar
              </Button>
              <Button className="w-full btn-neon">
                Matricule-se
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;

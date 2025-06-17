import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Menu, X, User } from "lucide-react";
import { Link } from "react-router-dom";
const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const scrollToContact = () => {
    const contactSection = document.getElementById('contato');
    if (contactSection) {
      contactSection.scrollIntoView({
        behavior: 'smooth'
      });
    }
    setIsMenuOpen(false); // Close mobile menu if open
  };
  return <nav className="fixed top-0 w-full z-50 bg-black/90 backdrop-blur-lg border-b border-white/10">
      <div className="container mx-auto px-[16px] my-0 py-[16px]">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-20 h-20 bg-gradient-brand rounded-lg flex items-center justify-center overflow-hidden">
              <img alt="Vivendo da Música" className="w-full h-full object-fill" src="/lovable-uploads/3c33eda7-abc0-49d8-a1c7-5354b45b1ee8.jpg" />
            </div>
            <span className="font-bold gradient-text text-lg">Vivenda da Música</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="#home" className="text-gray-300 hover:text-brand-light transition-colors">
              Início
            </a>
            <a href="#curso" className="text-gray-300 hover:text-brand-light transition-colors">
              O Curso
            </a>
            <a href="#instrutor" className="text-gray-300 hover:text-brand-light transition-colors">
              Instrutor
            </a>
            <a href="#depoimentos" className="text-gray-300 hover:text-brand-light transition-colors">
              Depoimentos
            </a>
            <button onClick={scrollToContact} className="text-gray-300 hover:text-brand-light transition-colors">
              Contato
            </button>
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <Link to="/login">
              <Button variant="ghost" className="text-gray-300 hover:text-brand-light">
                <User className="w-4 h-4 mr-2" />
                Entrar
              </Button>
            </Link>
            <Link to="/matricule-se">
              <Button className="btn-brand">
                Matricule-se
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button onClick={toggleMenu} className="md:hidden text-white p-2">
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && <div className="md:hidden glass-card mt-2 p-4 space-y-4">
            <a href="#home" className="block text-gray-300 hover:text-brand-light transition-colors py-2">
              Início
            </a>
            <a href="#curso" className="block text-gray-300 hover:text-brand-light transition-colors py-2">
              O Curso
            </a>
            <a href="#instrutor" className="block text-gray-300 hover:text-brand-light transition-colors py-2">
              Instrutor
            </a>
            <a href="#depoimentos" className="block text-gray-300 hover:text-brand-light transition-colors py-2">
              Depoimentos
            </a>
            <button onClick={scrollToContact} className="block text-gray-300 hover:text-brand-light transition-colors py-2 text-left w-full">
              Contato
            </button>
            <div className="pt-4 border-t border-white/10 space-y-3">
              <Link to="/login">
                <Button variant="ghost" className="w-full justify-start text-gray-300">
                  <User className="w-4 h-4 mr-2" />
                  Entrar
                </Button>
              </Link>
              <Link to="/matricule-se">
                <Button className="w-full btn-brand">
                  Matricule-se
                </Button>
              </Link>
            </div>
          </div>}
      </div>
    </nav>;
};
export default Navigation;

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Menu, X, Music } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Verificar se o usuário está logado
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };

    checkUser();

    // Listener para mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleGetStarted = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/matricule-se');
    }
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsOpen(false);
  };

  return (
    <nav className="fixed top-0 w-full bg-black/90 backdrop-blur-md border-b border-white/10 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-brand-light to-brand-medium rounded-full flex items-center justify-center">
              <Music className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold gradient-text">
              Vivendo da Música
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-gray-300 hover:text-white transition-colors">
              Início
            </Link>
            <button 
              onClick={() => scrollToSection('modulos')}
              className="text-gray-300 hover:text-white transition-colors"
            >
              Curso
            </button>
            <button 
              onClick={() => scrollToSection('instrutor')}
              className="text-gray-300 hover:text-white transition-colors"
            >
              Instrutor
            </button>
            <button 
              onClick={() => scrollToSection('depoimentos')}
              className="text-gray-300 hover:text-white transition-colors"
            >
              Depoimentos
            </button>
            <Link to="/contato" className="text-gray-300 hover:text-white transition-colors">
              Contato
            </Link>
            {user ? (
              <div className="flex items-center space-x-4">
                <Link to="/dashboard">
                  <Button className="btn-neon">
                    Dashboard
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link to="/login">
                  <Button variant="ghost" className="text-white hover:bg-white/10">
                    Entrar
                  </Button>
                </Link>
                <Button onClick={handleGetStarted} className="btn-neon">
                  Matricular
                </Button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden text-white"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden py-4 space-y-4 border-t border-white/10">
            <Link 
              to="/" 
              className="block text-gray-300 hover:text-white transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Início
            </Link>
            <button 
              onClick={() => scrollToSection('modulos')}
              className="block text-left text-gray-300 hover:text-white transition-colors w-full"
            >
              Curso
            </button>
            <button 
              onClick={() => scrollToSection('instrutor')}
              className="block text-left text-gray-300 hover:text-white transition-colors w-full"
            >
              Instrutor
            </button>
            <button 
              onClick={() => scrollToSection('depoimentos')}
              className="block text-left text-gray-300 hover:text-white transition-colors w-full"
            >
              Depoimentos
            </button>
            <Link 
              to="/contato" 
              className="block text-gray-300 hover:text-white transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Contato
            </Link>
            {user ? (
              <Link to="/dashboard" onClick={() => setIsOpen(false)}>
                <Button className="w-full btn-neon">
                  Dashboard
                </Button>
              </Link>
            ) : (
              <div className="space-y-2">
                <Link to="/login" onClick={() => setIsOpen(false)}>
                  <Button variant="ghost" className="w-full text-white hover:bg-white/10">
                    Entrar
                  </Button>
                </Link>
                <Button onClick={() => { handleGetStarted(); setIsOpen(false); }} className="w-full btn-neon">
                  Matricular
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;

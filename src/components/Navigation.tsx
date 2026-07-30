import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "@/auth/use-auth";
import { Button } from "@/components/ui/button";

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { session } = useAuth();
  const navigate = useNavigate();

  const handleGetStarted = () => navigate(session ? "/portal" : "/matricule-se");
  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
    setIsOpen(false);
  };

  const accountActions = session ? (
    <Link to="/portal" onClick={() => setIsOpen(false)}><Button className="btn-neon">Portal</Button></Link>
  ) : (
    <div className="flex items-center gap-3">
      <Link to="/login" onClick={() => setIsOpen(false)}><Button variant="ghost" className="text-white">Entrar</Button></Link>
      <Button onClick={() => { handleGetStarted(); setIsOpen(false); }} className="btn-neon">Matricular</Button>
    </div>
  );

  return (
    <nav className="fixed top-0 w-full bg-black/90 backdrop-blur-md border-b border-white/10 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-[85px]">
          <Link to="/" className="flex items-center space-x-2"><img src="/lovable-uploads/db1b3703-f32b-43e4-bc00-ee4e8e08c366.png" alt="Aprendendo com DJ Stay" className="w-20 h-20 object-contain" /><span className="text-2xl font-bold gradient-text">Aprendendo com DJ Stay</span></Link>
          <div className="hidden md:flex items-center space-x-8">
            <button onClick={() => scrollToSection("home")} className="text-gray-300 hover:text-white">Início</button>
            <button onClick={() => scrollToSection("curso")} className="text-gray-300 hover:text-white">Curso</button>
            <button onClick={() => scrollToSection("instrutor")} className="text-gray-300 hover:text-white">Instrutor</button>
            <button onClick={() => scrollToSection("depoimentos")} className="text-gray-300 hover:text-white">Depoimentos</button>
            <Link to="/contato" className="text-gray-300 hover:text-white">Contato</Link>
            {accountActions}
          </div>
          <button className="md:hidden text-white" onClick={() => setIsOpen((current) => !current)} aria-label="Abrir menu">{isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}</button>
        </div>
        {isOpen && <div className="md:hidden py-4 space-y-4 border-t border-white/10"><button onClick={() => scrollToSection("home")} className="block w-full text-left text-gray-300">Início</button><button onClick={() => scrollToSection("curso")} className="block w-full text-left text-gray-300">Curso</button><button onClick={() => scrollToSection("instrutor")} className="block w-full text-left text-gray-300">Instrutor</button><Link to="/contato" onClick={() => setIsOpen(false)} className="block text-gray-300">Contato</Link>{accountActions}</div>}
      </div>
    </nav>
  );
};

export default Navigation;

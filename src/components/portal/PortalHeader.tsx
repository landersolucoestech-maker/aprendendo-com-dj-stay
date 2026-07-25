import { Link, NavLink, useNavigate } from "react-router-dom";
import { BookOpen, LogOut, ShoppingCart, UserRoundCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export default function PortalHeader() {
  const { profile, hasRole, signOut } = useAuth();
  const navigate = useNavigate();
  const canManage = hasRole("instructor", "support", "admin", "owner");

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm transition-colors ${isActive ? "text-white" : "text-gray-400 hover:text-white"}`;

  return (
    <header className="border-b border-white/10 bg-black/95 sticky top-0 z-40">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link to="/dashboard" className="font-bold gradient-text flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          Aprendendo com DJ Stay
        </Link>
        <nav className="hidden md:flex items-center gap-5">
          <NavLink to="/dashboard" className={linkClass}>Dashboard</NavLink>
          <NavLink to="/meus-cursos" className={linkClass}>Meus cursos</NavLink>
          <NavLink to="/catalogo" className={linkClass}>Catálogo</NavLink>
          <NavLink to="/pedidos" className={linkClass}>Pedidos</NavLink>
          <NavLink to="/suporte" className={linkClass}>Suporte</NavLink>
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate("/carrinho")} aria-label="Carrinho">
            <ShoppingCart className="w-5 h-5" />
          </Button>
          {canManage && (
            <Button variant="outline" className="border-white/20 bg-transparent" onClick={() => navigate("/instrutor")}>
              <UserRoundCog className="w-4 h-4 mr-2" />
              Gestão
            </Button>
          )}
          <span className="hidden lg:block text-sm text-gray-300 max-w-40 truncate">{profile?.full_name ?? "Usuário"}</span>
          <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Sair">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}

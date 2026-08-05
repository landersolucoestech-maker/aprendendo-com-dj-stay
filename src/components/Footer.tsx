import { BadgeCheck, BookOpen, LifeBuoy, LogIn } from "lucide-react";
import { Link } from "react-router-dom";

import { brandConfig } from "@/config/brand";

const footerLinkClassName =
  "rounded-sm text-gray-400 transition-colors hover:text-brand-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-black";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer id="contato" className="border-t border-white/10 bg-black">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img
                src={brandConfig.logoPath}
                alt={brandConfig.logoAlt}
                className="h-14 w-14 object-contain"
              />
              <span className="gradient-text text-xl font-bold">
                {brandConfig.name}
              </span>
            </div>
            <p className="leading-7 text-gray-400">
              Plataforma educacional para cursos publicados por DJ Stay, com
              acesso, progresso, suporte e certificados controlados pelas regras
              persistidas do sistema.
            </p>
          </div>

          <nav aria-label="Conteúdo público">
            <h2 className="mb-4 font-semibold text-white">Conteúdo</h2>
            <ul className="space-y-3">
              <li>
                <a href="#curso" className={footerLinkClassName}>
                  Cursos publicados
                </a>
              </li>
              <li>
                <a href="#instrutor" className={footerLinkClassName}>
                  Instrutor
                </a>
              </li>
              <li>
                <a href="#transparencia" className={footerLinkClassName}>
                  Transparência operacional
                </a>
              </li>
              <li>
                <Link to="/certificado" className={footerLinkClassName}>
                  Validar certificado
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="Conta e suporte">
            <h2 className="mb-4 font-semibold text-white">Conta e suporte</h2>
            <ul className="space-y-3">
              <li>
                <Link to="/login" className={footerLinkClassName}>
                  Entrar
                </Link>
              </li>
              <li>
                <Link to="/matricule-se" className={footerLinkClassName}>
                  Criar conta
                </Link>
              </li>
              <li>
                <Link to="/contato" className={footerLinkClassName}>
                  Abrir solicitação de contato
                </Link>
              </li>
            </ul>
          </nav>

          <div>
            <h2 className="mb-4 font-semibold text-white">Operação</h2>
            <ul className="space-y-4 text-sm text-gray-400">
              <li className="flex gap-3">
                <BookOpen
                  className="mt-0.5 h-5 w-5 shrink-0 text-brand-light"
                  aria-hidden="true"
                />
                <span>Catálogo e currículo publicados pelo CMS.</span>
              </li>
              <li className="flex gap-3">
                <LogIn
                  className="mt-0.5 h-5 w-5 shrink-0 text-brand-medium"
                  aria-hidden="true"
                />
                <span>Acesso privado condicionado à sessão e ao papel.</span>
              </li>
              <li className="flex gap-3">
                <LifeBuoy
                  className="mt-0.5 h-5 w-5 shrink-0 text-brand-light"
                  aria-hidden="true"
                />
                <span>Contato e suporte registrados com protocolo.</span>
              </li>
              <li className="flex gap-3">
                <BadgeCheck
                  className="mt-0.5 h-5 w-5 shrink-0 text-brand-medium"
                  aria-hidden="true"
                />
                <span>Operação tecnológica: {brandConfig.legalOwner}.</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-8 text-sm text-gray-400">
          © {currentYear} {brandConfig.name}. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
};

export default Footer;

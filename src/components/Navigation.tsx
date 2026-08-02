import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "@/auth/use-auth";
import { Button } from "@/components/ui/button";
import { brandConfig } from "@/config/brand";

const sectionLinks = [
  { label: "Início", sectionId: "home" },
  { label: "Cursos", sectionId: "curso" },
  { label: "Instrutor", sectionId: "instrutor" },
  { label: "Transparência", sectionId: "transparencia" },
] as const;

const navigationItemClassName =
  "rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const mobileFocusableSelector =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const { session } = useAuth();

  useEffect(() => {
    if (!isOpen) return;

    mobileMenuRef.current
      ?.querySelector<HTMLElement>(mobileFocusableSelector)
      ?.focus();

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      event.preventDefault();
      setIsOpen(false);
      window.requestAnimationFrame(() => menuButtonRef.current?.focus());
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  const closeMenu = () => setIsOpen(false);

  const scrollToSection = (sectionId: string) => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    document.getElementById(sectionId)?.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
    closeMenu();
  };

  const renderAccountActions = (mobile = false) => {
    const buttonClassName = mobile ? "w-full" : undefined;

    if (session) {
      return (
        <Button asChild variant="brand" className={buttonClassName}>
          <Link to="/portal" onClick={closeMenu}>
            Portal
          </Link>
        </Button>
      );
    }

    return (
      <div className={mobile ? "grid gap-3" : "flex items-center gap-3"}>
        <Button asChild variant="ghost" className={buttonClassName}>
          <Link to="/login" onClick={closeMenu}>
            Entrar
          </Link>
        </Button>
        <Button asChild variant="brand" className={buttonClassName}>
          <Link to="/matricule-se" onClick={closeMenu}>
            Matricular
          </Link>
        </Button>
      </div>
    );
  };

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md"
    >
      <div className="container mx-auto px-4">
        <div className="flex h-[85px] items-center justify-between gap-4">
          <Link
            to="/"
            onClick={closeMenu}
            className="flex min-w-0 items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <img
              src={brandConfig.logoPath}
              alt={brandConfig.logoAlt}
              className="h-20 w-20 shrink-0 object-contain"
            />
            <span className="gradient-text hidden truncate text-xl font-bold sm:inline lg:text-2xl">
              {brandConfig.name}
            </span>
          </Link>

          <div className="hidden items-center gap-6 md:flex lg:gap-8">
            {sectionLinks.map((item) => (
              <button
                key={item.sectionId}
                type="button"
                onClick={() => scrollToSection(item.sectionId)}
                className={navigationItemClassName}
              >
                {item.label}
              </button>
            ))}
            <Link to="/contato" className={navigationItemClassName}>
              Contato
            </Link>
            {renderAccountActions()}
          </div>

          <button
            ref={menuButtonRef}
            type="button"
            className="rounded-md p-2 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background md:hidden"
            onClick={() => setIsOpen((current) => !current)}
            aria-label={isOpen ? "Fechar menu" : "Abrir menu"}
            aria-controls="mobile-navigation"
            aria-expanded={isOpen}
          >
            {isOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </div>

        {isOpen ? (
          <div
            ref={mobileMenuRef}
            id="mobile-navigation"
            className="space-y-2 border-t border-border py-4 md:hidden"
          >
            {sectionLinks.map((item) => (
              <button
                key={item.sectionId}
                type="button"
                onClick={() => scrollToSection(item.sectionId)}
                className={`${navigationItemClassName} block w-full px-3 py-2 text-left`}
              >
                {item.label}
              </button>
            ))}
            <Link
              to="/contato"
              onClick={closeMenu}
              className={`${navigationItemClassName} block px-3 py-2`}
            >
              Contato
            </Link>
            <div className="pt-2">{renderAccountActions(true)}</div>
          </div>
        ) : null}
      </div>
    </nav>
  );
};

export default Navigation;

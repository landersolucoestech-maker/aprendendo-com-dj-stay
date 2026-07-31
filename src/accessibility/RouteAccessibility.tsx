import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

type RouteAccessibilityProps = {
  children: ReactNode;
};

const focusTargetId = "main-content";

export const RouteAccessibility = ({ children }: RouteAccessibilityProps) => {
  const location = useLocation();
  const boundaryRef = useRef<HTMLDivElement>(null);
  const previousPathRef = useRef(location.pathname);
  const [announcement, setAnnouncement] = useState("");

  const preparePrimaryContent = (): HTMLElement | null => {
    const boundary = boundaryRef.current;
    if (!boundary) return null;

    const semanticMain = boundary.querySelector<HTMLElement>('main, [role="main"]');
    const target = semanticMain ?? boundary;
    const previousTarget = document.getElementById(focusTargetId);

    if (previousTarget && previousTarget !== target) {
      previousTarget.removeAttribute("id");
      if (previousTarget.dataset.routeFocusTarget === "true") {
        previousTarget.removeAttribute("tabindex");
        delete previousTarget.dataset.routeFocusTarget;
      }
    }

    target.id = focusTargetId;
    if (!target.hasAttribute("tabindex")) {
      target.tabIndex = -1;
      target.dataset.routeFocusTarget = "true";
    }

    return target;
  };

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const target = preparePrimaryContent();
      if (!target) return;

      if (previousPathRef.current !== location.pathname) {
        target.focus({ preventScroll: true });
        setAnnouncement("Navegação concluída. Conteúdo principal atualizado.");
      }
      previousPathRef.current = location.pathname;
    });

    return () => window.cancelAnimationFrame(frame);
  }, [location.pathname]);

  const handleSkipToContent = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const target = preparePrimaryContent();
    if (!target) return;

    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: "start" });
  };

  return (
    <>
      <a
        href={`#${focusTargetId}`}
        onClick={handleSkipToContent}
        className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground shadow-lg transition-transform focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
      >
        Pular para o conteúdo principal
      </a>
      <div ref={boundaryRef}>{children}</div>
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
    </>
  );
};

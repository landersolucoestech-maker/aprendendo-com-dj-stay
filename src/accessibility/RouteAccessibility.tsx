import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { useLocation } from "react-router";

type RouteAccessibilityProps = {
  children: ReactNode;
};

const focusTargetId = "main-content";
const focusDeferredAttribute = "data-route-focus-deferred";

export const RouteAccessibility = ({ children }: RouteAccessibilityProps) => {
  const location = useLocation();
  const boundaryRef = useRef<HTMLDivElement>(null);
  const previousPathRef = useRef(location.pathname);
  const focusedPathRef = useRef<string | null>(null);
  const focusedTargetRef = useRef<HTMLElement | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const preparePrimaryContent = useCallback((): HTMLElement | null => {
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

    if (semanticMain) {
      if (boundary.dataset.routeMainFallback === "true") {
        boundary.removeAttribute("role");
        delete boundary.dataset.routeMainFallback;
      }
    } else {
      boundary.setAttribute("role", "main");
      boundary.dataset.routeMainFallback = "true";
    }

    target.id = focusTargetId;
    if (!target.hasAttribute("tabindex")) {
      target.tabIndex = -1;
      target.dataset.routeFocusTarget = "true";
    }

    return target;
  }, []);

  useEffect(() => {
    const boundary = boundaryRef.current;
    if (!boundary) return;

    let frame: number | null = null;

    const prepareAfterRender = () => {
      if (frame !== null) {
        window.cancelAnimationFrame(frame);
      }

      frame = window.requestAnimationFrame(() => {
        frame = null;
        const target = preparePrimaryContent();
        if (!target) return;

        const routeChanged = previousPathRef.current !== location.pathname;
        const focusIsDeferred =
          target.getAttribute(focusDeferredAttribute) === "true";
        const focusedTargetWasReplaced =
          focusedPathRef.current === location.pathname &&
          focusedTargetRef.current !== null &&
          !focusedTargetRef.current.isConnected;

        if (routeChanged && focusIsDeferred) {
          return;
        }

        if (routeChanged || focusedTargetWasReplaced) {
          target.focus({ preventScroll: true });
          focusedPathRef.current = location.pathname;
          focusedTargetRef.current = target;

          if (routeChanged) {
            setAnnouncement(
              "Navegação concluída. Conteúdo principal atualizado.",
            );
          }
        }

        previousPathRef.current = location.pathname;
      });
    };

    const observer = new MutationObserver(prepareAfterRender);
    observer.observe(boundary, {
      childList: true,
      subtree: true,
    });
    prepareAfterRender();

    return () => {
      observer.disconnect();
      if (frame !== null) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [location.pathname, preparePrimaryContent]);

  const handleSkipToContent = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const target = preparePrimaryContent();
    if (!target) return;

    target.focus({ preventScroll: true });
    focusedPathRef.current = location.pathname;
    focusedTargetRef.current = target;
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

import { useLayoutEffect } from "react";

import BenefitsSection from "@/components/BenefitsSection";
import CourseModulesSection from "@/components/CourseModulesSection";
import Footer from "@/components/Footer";
import HeroSection from "@/components/HeroSection";
import InstructorSection from "@/components/InstructorSection";
import Navigation from "@/components/Navigation";
import OperationalTrustSection from "@/components/OperationalTrustSection";

const SECTION_HEADER_OFFSET = 85;
const INITIAL_HASH_RECHECK_DELAYS = [0, 100, 500, 1500] as const;

const getHashSectionId = (): string | null => {
  const rawHash = window.location.hash.slice(1);
  if (!rawHash) return null;

  try {
    return decodeURIComponent(rawHash);
  } catch {
    return null;
  }
};

const scrollToCurrentHash = (behavior: ScrollBehavior): boolean => {
  const sectionId = getHashSectionId();
  if (!sectionId) return false;

  const target = document.getElementById(sectionId);
  if (!target) return false;

  const top = Math.max(
    0,
    target.getBoundingClientRect().top + window.scrollY - SECTION_HEADER_OFFSET,
  );

  if (behavior === "auto") {
    window.scrollTo(0, top);
  } else {
    window.scrollTo({ top, behavior });
  }

  return true;
};

const Index = () => {
  useLayoutEffect(() => {
    const timeoutIds = INITIAL_HASH_RECHECK_DELAYS.map((delay) =>
      window.setTimeout(() => {
        scrollToCurrentHash("auto");
      }, delay),
    );

    const handleHashChange = () => {
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      window.requestAnimationFrame(() => {
        scrollToCurrentHash(prefersReducedMotion ? "auto" : "smooth");
      });
    };

    window.addEventListener("hashchange", handleHashChange);

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <Navigation />
      <main id="main-content" tabIndex={-1}>
        <HeroSection />
        <BenefitsSection />
        <CourseModulesSection />
        <InstructorSection />
        <OperationalTrustSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;

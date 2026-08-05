import { useEffect } from "react";

import BenefitsSection from "@/components/BenefitsSection";
import CourseModulesSection from "@/components/CourseModulesSection";
import Footer from "@/components/Footer";
import HeroSection from "@/components/HeroSection";
import InstructorSection from "@/components/InstructorSection";
import Navigation from "@/components/Navigation";
import OperationalTrustSection from "@/components/OperationalTrustSection";

const SECTION_HEADER_OFFSET = 85;
const MAX_HASH_SCROLL_ATTEMPTS = 120;

const Index = () => {
  useEffect(() => {
    let animationFrameId: number | null = null;
    let attempts = 0;

    const scrollToHashSection = () => {
      const rawHash = window.location.hash.slice(1);
      if (!rawHash) return;

      let sectionId: string;
      try {
        sectionId = decodeURIComponent(rawHash);
      } catch {
        return;
      }

      const target = document.getElementById(sectionId);
      if (!target) {
        attempts += 1;
        if (attempts < MAX_HASH_SCROLL_ATTEMPTS) {
          animationFrameId = window.requestAnimationFrame(scrollToHashSection);
        }
        return;
      }

      attempts = 0;
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const top = Math.max(
        0,
        target.getBoundingClientRect().top +
          window.scrollY -
          SECTION_HEADER_OFFSET,
      );

      window.scrollTo({
        top,
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
    };

    const scheduleHashScroll = () => {
      attempts = 0;
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }
      animationFrameId = window.requestAnimationFrame(scrollToHashSection);
    };

    scheduleHashScroll();
    window.addEventListener("hashchange", scheduleHashScroll);

    return () => {
      window.removeEventListener("hashchange", scheduleHashScroll);
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }
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

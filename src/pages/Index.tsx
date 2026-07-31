import BenefitsSection from "@/components/BenefitsSection";
import CourseModulesSection from "@/components/CourseModulesSection";
import Footer from "@/components/Footer";
import HeroSection from "@/components/HeroSection";
import InstructorSection from "@/components/InstructorSection";
import Navigation from "@/components/Navigation";
import TestimonialsSection from "@/components/TestimonialsSection";

const Index = () => (
  <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
    <Navigation />
    <main id="main-content" tabIndex={-1}>
      <HeroSection />
      <BenefitsSection />
      <CourseModulesSection />
      <InstructorSection />
      <TestimonialsSection />
    </main>
    <Footer />
  </div>
);

export default Index;

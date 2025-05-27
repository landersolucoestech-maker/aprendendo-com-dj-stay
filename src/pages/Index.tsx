
import Navigation from "@/components/Navigation";
import HeroSection from "@/components/HeroSection";
import BenefitsSection from "@/components/BenefitsSection";
import CourseModulesSection from "@/components/CourseModulesSection";
import InstructorSection from "@/components/InstructorSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <Navigation />
      <HeroSection />
      <BenefitsSection />
      <CourseModulesSection />
      <InstructorSection />
      <TestimonialsSection />
      <Footer />
    </div>
  );
};

export default Index;

import Navbar from "@/components/homepage/Navbar";
import HeroSection from "@/components/homepage/HeroSection";
import FeaturesSection from "@/components/homepage/FeaturesSection";
import AISection from "@/components/homepage/AISection";
import PricingSection from "@/components/homepage/PricingSection";
import CTASection from "@/components/homepage/CTASection";
import Footer from "@/components/homepage/Footer";

export default function Home() {
  return (
    <main className="bg-[#0a0a0f] text-[#e4e4ef] overflow-x-hidden">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <AISection />
      <PricingSection />
      <CTASection />
      <Footer />
    </main>
  );
}

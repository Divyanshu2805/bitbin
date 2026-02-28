import Navbar from "@/components/homepage/Navbar";
import HeroSection from "@/components/homepage/HeroSection";
import TypeMarquee from "@/components/homepage/TypeMarquee";
import FeaturesSection from "@/components/homepage/FeaturesSection";
import AISection from "@/components/homepage/AISection";
import PricingSection from "@/components/homepage/PricingSection";
import CTASection from "@/components/homepage/CTASection";
import Footer from "@/components/homepage/Footer";

export default function Home() {
  return (
    <main className="overflow-x-hidden bg-background text-foreground">
      <Navbar />
      <HeroSection />
      <TypeMarquee />
      <FeaturesSection />
      <AISection />
      <PricingSection />
      <CTASection />
      <Footer />
    </main>
  );
}

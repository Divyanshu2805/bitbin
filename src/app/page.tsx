import Navbar from "@/components/homepage/Navbar";
import Hero from "@/components/homepage/Hero";
import OrganizeSection from "@/components/homepage/OrganizeSection";
import TypesGrid from "@/components/homepage/TypesGrid";
import AgentSection from "@/components/homepage/AgentSection";
import AiSection from "@/components/homepage/AiSection";
import ExtensionSection from "@/components/homepage/ExtensionSection";
import ShortcutsSection from "@/components/homepage/ShortcutsSection";
import PricingSection from "@/components/homepage/PricingSection";
import FaqSection from "@/components/homepage/FaqSection";
import BackToTop from "@/components/homepage/BackToTop";
import Footer from "@/components/homepage/Footer";
import { LandingRoot } from "@/components/homepage/ui";

export default function Home() {
  return (
    <LandingRoot>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-lg focus:bg-card focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      <Navbar />
      <main id="main">
        <Hero />
        <OrganizeSection />
        <TypesGrid />
        <AgentSection />
        <AiSection />
        <ExtensionSection />
        <ShortcutsSection />
        <PricingSection />
        <FaqSection />
      </main>
      <Footer />
      <BackToTop />
    </LandingRoot>
  );
}

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
import type { Metadata } from "next";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

// The one page that is the site's own address; the layout supplies the rest of the metadata.
export const metadata: Metadata = { alternates: { canonical: "/" } };

// Structured data for search engines. Static content only: nothing here comes from a user.
const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: SITE_NAME,
  description: SITE_DESCRIPTION,
  url: SITE_URL,
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  offers: [
    { "@type": "Offer", name: "Free", price: "0", priceCurrency: "USD" },
    { "@type": "Offer", name: "Pro", price: "8", priceCurrency: "USD" },
  ],
};

export default function Home() {
  return (
    <LandingRoot>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA).replace(/</g, "\\u003c") }}
      />
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

import Link from "next/link";
import { Button } from "@/components/ui/button";
import ScrollFadeIn from "./ScrollFadeIn";

export default function CTASection() {
  return (
    <section className="py-[120px] text-center bg-[#0a0a0f]">
      <div className="max-w-[1200px] mx-auto px-6">
        <ScrollFadeIn>
          <h2 className="text-[clamp(1.8rem,3.5vw,2.8rem)] font-extrabold leading-tight mb-4 tracking-tight max-sm:text-[1.6rem]">
            Ready to Organize Your
            <br />
            <span className="bg-gradient-to-r from-blue-700 via-blue-500 to-blue-400 bg-clip-text text-transparent">
              Developer Knowledge?
            </span>
          </h2>
          <p className="text-base text-[#8888a4] max-w-[520px] mx-auto mb-8 leading-relaxed">
            Join thousands of developers who stopped losing their best work.
          </p>
          <Button asChild size="lg" className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-400 text-white border-0 px-8 py-3 text-base hover:opacity-90 hover:-translate-y-0.5 transition-all">
            <Link href="/register">Get Started Free</Link>
          </Button>
        </ScrollFadeIn>
      </div>
    </section>
  );
}

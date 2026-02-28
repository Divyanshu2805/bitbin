import ScrollFadeIn from "./ScrollFadeIn";

interface SectionHeadingProps {
  eyebrow: string;
  title: React.ReactNode;
  description?: string;
  align?: "left" | "center";
}

/** Mono eyebrow + display heading used by every homepage section */
export default function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
}: SectionHeadingProps) {
  const centered = align === "center";

  return (
    <ScrollFadeIn className={centered ? "mx-auto text-center" : ""}>
      <span className="mb-4 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-lime">
        <span className="h-px w-6 bg-lime/60" />
        {eyebrow}
      </span>
      <h2 className="text-[clamp(2rem,4vw,3rem)] font-bold leading-[1.05] tracking-[-0.03em]">
        {title}
      </h2>
      {description && (
        <p
          className={`mt-4 max-w-[540px] text-base leading-relaxed text-muted-foreground ${
            centered ? "mx-auto" : ""
          }`}
        >
          {description}
        </p>
      )}
    </ScrollFadeIn>
  );
}

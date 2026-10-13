import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

/** The body of a Pro-only settings card on the Free plan: what is locked, and the way to Pro. */
export default function ProLocked({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-desc text-sm">{children}</p>
      <Button asChild variant="upgrade" size="sm">
        <Link href="/upgrade">
          <Sparkles className="h-4 w-4" />
          Upgrade to Pro
        </Link>
      </Button>
    </div>
  );
}

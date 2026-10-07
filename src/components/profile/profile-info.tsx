import Link from "next/link";
import { CalendarDays, Github, KeyRound, Mail, Sparkles, UserRound } from "lucide-react";
import Panel from "@/components/shared/panel";
import { UserAvatar } from "@/components/shared/user-avatar";
import { cn } from "@/lib/utils";
import EditableName from "./editable-name";

interface ProfileInfoProps {
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    createdAt: Date;
  };
  isPro?: boolean;
}

/** Who you are: avatar, a name you can edit and your email, then how you sign in, since when and your plan. */
export default function ProfileInfo({ user, isPro }: ProfileInfoProps) {
  const memberSince = new Date(user.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const github = Boolean(user.image);

  const tiles = [
    {
      key: "sign-in",
      icon: github ? <Github /> : <KeyRound />,
      value: github ? "GitHub" : "Email + password",
    },
    { key: "member since", icon: <CalendarDays />, value: memberSince },
  ];

  return (
    <Panel id="account" icon={<UserRound />} title="Account" description="Who you are in BitBin, and how you sign in.">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <UserAvatar
            name={user.name}
            image={user.image}
            className="h-16 w-16 shrink-0 text-lg ring-2 ring-lime/30 ring-offset-2 ring-offset-card"
          />
          <div className="min-w-0 flex-1 space-y-1">
            <EditableName name={user.name} />
            <p className="flex min-w-0 items-center gap-1.5 font-mono text-xs text-muted-foreground">
              <Mail className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{user.email}</span>
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {tiles.map((tile) => (
            <div key={tile.key} className="rounded-lg border border-border bg-background/50 px-4 py-3">
              <p className="font-mono text-[11px] text-muted-foreground">
                <span className="text-faint dark:text-muted-foreground/50">{"// "}</span>
                {tile.key}
              </p>
              <p className="mt-1.5 flex items-center gap-2 text-sm font-medium [&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground">
                {tile.icon}
                <span className="truncate">{tile.value}</span>
              </p>
            </div>
          ))}

          <div
            className={cn(
              "rounded-lg border px-4 py-3",
              isPro ? "border-lime/30 bg-lime/[0.06]" : "border-coral/25 bg-coral/[0.05]"
            )}
          >
            <p className="font-mono text-[11px] text-muted-foreground">
              <span className="text-faint dark:text-muted-foreground/50">{"// "}</span>
              plan
            </p>
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <p className={cn("flex items-center gap-2 text-sm font-medium", isPro ? "text-lime" : "text-foreground")}>
                <Sparkles className={cn("h-4 w-4", isPro ? "text-lime" : "text-coral")} />
                {isPro ? "Pro" : "Free"}
              </p>
              {!isPro && (
                <Link href="/upgrade" className="font-mono text-xs text-coral hover:underline">
                  upgrade →
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}

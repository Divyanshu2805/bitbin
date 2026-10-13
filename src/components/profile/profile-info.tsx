import RoundArrow from "@/components/shared/round-arrow";
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

  const facts = [
    {
      key: "Sign-in",
      icon: github ? <Github /> : <KeyRound />,
      value: github ? "GitHub" : "Email + password",
    },
    { key: "Member since", icon: <CalendarDays />, value: memberSince },
  ];

  return (
    <Panel id="account" icon={<UserRound />} title="Account" description="Who you are in BitBin, and how you sign in.">
      <div className="flex items-center gap-4">
        <UserAvatar
          name={user.name}
          image={user.image}
          className="h-16 w-16 shrink-0 text-lg ring-1 ring-border ring-offset-2 ring-offset-card"
        />
        <div className="min-w-0 flex-1 space-y-1">
          <EditableName name={user.name} />
          <p className="flex min-w-0 items-center gap-1.5 font-mono text-xs text-muted-foreground">
            <Mail className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{user.email}</span>
          </p>
        </div>
      </div>

      {/* The facts as one ruled strip along the card's foot, not boxes inside the box */}
      <dl className="-mx-6 -mb-6 mt-6 grid divide-y divide-border border-t border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {facts.map((fact) => (
          <div key={fact.key} className="min-w-0 px-6 py-4">
            <dt className="font-mono text-[11px] text-muted-foreground">{fact.key}</dt>
            <dd className="mt-1.5 flex items-center gap-2 text-sm font-medium [&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground">
              {fact.icon}
              <span className="truncate">{fact.value}</span>
            </dd>
          </div>
        ))}

        <div className="min-w-0 px-6 py-4">
          <dt className="font-mono text-[11px] text-muted-foreground">Plan</dt>
          <dd className="mt-1.5 flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className={cn("h-4 w-4 shrink-0", isPro ? "text-lime" : "text-muted-foreground")} />
              {isPro ? "Pro" : "Free"}
            </span>
            {!isPro && (
              <Link href="/upgrade" className="group inline-flex items-center gap-2 text-[13px] font-medium text-coral">
                Upgrade
                <RoundArrow />
              </Link>
            )}
          </dd>
        </div>
      </dl>
    </Panel>
  );
}

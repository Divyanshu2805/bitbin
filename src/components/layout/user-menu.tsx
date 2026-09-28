"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Keyboard, LogOut, User, Settings, Sparkles } from "lucide-react";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
} from "@/components/ui/dropdown-menu";
import { Kbd } from "@/components/shared/kbd";
import { SHORTCUTS_EVENT } from "@/components/layout/app-shortcuts";
import { goKeys } from "@/lib/constants/shortcuts";
import { cn } from "@/lib/utils";
import { slideTo } from "@/lib/view-transition";
import { clearExplanations } from "@/lib/explanation-store";

interface UserMenuProps {
  isPro?: boolean;
  onNavigate?: () => void;
}

// Rows are sidebar rows: same height and type, the same faint lime pill with a lime
// edge when highlighted, the same one-way sweep of light (`.sidebar-row`), and the
// icon turns lime. Radix highlights on hover and keyboard alike (`data-highlighted`).
const ITEM =
  "sidebar-row relative h-8 gap-3 overflow-hidden rounded-lg px-2.5 text-[13.5px] text-foreground/80 transition-colors duration-200 focus:text-foreground focus:[&_svg:not([class*='text-'])]:text-lime";

/**
 * The account menu (sidebar and mobile sidebar). It opens above its trigger at
 * the trigger's width, so it lines up with the sidebar, on the popover surface
 * like every other menu: account links with their shortcuts, and sign out (the trigger itself
 * already shows who's signed in).
 */
export default function UserMenuContent({ isPro, onNavigate }: UserMenuProps) {
  const router = useRouter();
  const profileKeys = goKeys("/profile");
  const settingsKeys = goKeys("/settings");

  return (
    <DropdownMenuContent
      side="top"
      align="start"
      sideOffset={8}
      className="w-(--radix-dropdown-menu-trigger-width) min-w-[13.5rem] rounded-xl border-border bg-popover p-1.5 shadow-[var(--shadow-lift)]"
    >
      <DropdownMenuItem asChild className={ITEM}>
        <Link href="/profile" onClick={onNavigate}>
          <User />
          Profile
          {profileKeys && (
            <DropdownMenuShortcut>
              <Kbd keys={profileKeys} />
            </DropdownMenuShortcut>
          )}
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild className={ITEM}>
        <Link href="/settings" onClick={onNavigate}>
          <Settings />
          Settings
          {settingsKeys && (
            <DropdownMenuShortcut>
              <Kbd keys={settingsKeys} />
            </DropdownMenuShortcut>
          )}
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem
        className={ITEM}
        onClick={() => {
          onNavigate?.();
          window.dispatchEvent(new Event(SHORTCUTS_EVENT));
        }}
      >
        <Keyboard />
        Keyboard shortcuts
        <DropdownMenuShortcut>
          <Kbd keys={["?"]} />
        </DropdownMenuShortcut>
      </DropdownMenuItem>
      {!isPro && (
        <DropdownMenuItem
          asChild
          // The gliding highlight turns coral here
          data-tone="coral"
          className={cn(ITEM, "focus:text-coral focus:[&_svg:not([class*='text-'])]:text-coral")}
        >
          <Link href="/upgrade" onClick={onNavigate}>
            <Sparkles />
            Upgrade to Pro
          </Link>
        </DropdownMenuItem>
      )}

      <DropdownMenuSeparator className="mx-1 my-1" />
      <DropdownMenuItem
        onClick={() =>
          // Signs out without a reload, then slides back to the sign-in page
          slideTo(
            async () => {
              // Explanations saved in this browser belong to this account
              clearExplanations();
              await signOut({ redirect: false });
              router.push("/sign-in");
            },
            "/sign-in",
            { back: true }
          )
        }
        variant="destructive"
        className={ITEM}
      >
        <LogOut />
        Sign out
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
}

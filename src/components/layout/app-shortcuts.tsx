"use client";

import { useEffect, useState } from "react";
import { Command, Compass, FileText, Folder } from "lucide-react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Kbd } from "@/components/shared/kbd";
import { PathPill } from "@/components/shared/page-header";
import { toggleSidebar } from "@/hooks/use-sidebar-collapsed";
import { isTyping, overlayOpen, useHotkey } from "@/hooks/use-hotkey";
import { GO_SHORTCUTS, SHORTCUT_GROUPS, TYPE_SHORTCUTS } from "@/lib/constants/shortcuts";

/** Fired by anything that wants the shortcuts sheet open (the status bar's `?`). */
export const SHORTCUTS_EVENT = "bitbin:shortcuts";

// How long after `G` the second key still counts
const SEQUENCE_MS = 1200;

const GROUP_ICONS: Record<string, React.ReactNode> = {
  general: <Command />,
  "go to": <Compass />,
  "open item": <FileText />,
  "collection page": <Folder />,
};

/**
 * App-wide navigation keys: `G` then a letter (G D dashboard, G S settings…),
 * 1–7 for the item types, `[` for the sidebar, and `?` for a sheet listing
 * every shortcut. Renders only that sheet.
 */
export default function AppShortcuts() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useHotkey("[", toggleSidebar);
  useHotkey("?", () => setOpen(true));

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(SHORTCUTS_EVENT, onOpen);
    return () => window.removeEventListener(SHORTCUTS_EVENT, onOpen);
  }, []);

  // `G` sequences and digits. Capture phase, so a consumed second key (the C in
  // G C) never reaches the single-key shortcuts (C = new collection).
  useEffect(() => {
    let pendingAt = 0;
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTyping(event.target) || overlayOpen()) return;
      const key = event.key.toLowerCase();

      if (pendingAt && Date.now() - pendingAt < SEQUENCE_MS) {
        pendingAt = 0;
        const target = GO_SHORTCUTS.find((s) => s.key === key);
        if (target) {
          event.preventDefault();
          router.push(target.href);
        }
        return;
      }
      pendingAt = 0;

      if (key === "g") {
        event.preventDefault();
        pendingAt = Date.now();
        return;
      }
      const type = Object.entries(TYPE_SHORTCUTS).find(([, digit]) => digit === key)?.[0];
      if (type) {
        event.preventDefault();
        router.push(`/items/${type}s`);
      }
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* Nothing in the sheet needs focus, so none is moved to the close button on open */}
      <DialogContent
        onOpenAutoFocus={(event) => event.preventDefault()}
        className="thin-scrollbar max-h-[85dvh] gap-5 overflow-y-auto sm:max-w-2xl"
      >
        <DialogHeader className="items-start space-y-2.5">
          <PathPill path="shortcuts" />
          <DialogTitle className="font-display text-xl tracking-[-0.03em]">Keyboard shortcuts</DialogTitle>
          <DialogDescription className="text-desc">
            BitBin is built to be driven from the keyboard. Single keys work anywhere you&apos;re not typing.
          </DialogDescription>
        </DialogHeader>

        <div className="gap-5 sm:columns-2">
          {SHORTCUT_GROUPS.map((group) => (
            <section key={group.title} className="mb-5 break-inside-avoid">
              <h3 className="mb-2 flex items-center gap-2 font-mono text-[11px] font-normal text-muted-foreground [&_svg]:h-3.5 [&_svg]:w-3.5 [&_svg]:text-lime">
                {GROUP_ICONS[group.title]}
                <span>
                  <span className="text-faint dark:text-muted-foreground/50">{"// "}</span>
                  {group.title}
                </span>
                <span className="ml-auto tabular-nums text-faint dark:text-muted-foreground/60">[{group.items.length}]</span>
              </h3>
              <ul className="overflow-hidden rounded-lg border border-border bg-card/60">
                {group.items.map((item) => (
                  <li
                    key={item.label}
                    className="flex items-center justify-between gap-4 border-b border-border/60 px-3 py-2 transition-colors last:border-b-0 hover:bg-lime/[0.05]"
                  >
                    <span className="min-w-0">
                      <span className="block text-[13.5px] text-foreground/90">{item.label}</span>
                      {item.hint && <span className="block text-xs text-muted-foreground">{item.hint}</span>}
                    </span>
                    <Kbd keys={item.keys} className="shrink-0" />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <p className="-mt-2 flex items-center justify-between border-t border-border pt-3 font-mono text-[11px] text-muted-foreground">
          <span>
            <span className="kbd">?</span> opens this anywhere
          </span>
          <span>
            <span className="kbd">Esc</span> to close
          </span>
        </p>
      </DialogContent>
    </Dialog>
  );
}

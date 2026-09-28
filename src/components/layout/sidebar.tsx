"use client";

import Link from "next/link";
import { ChevronsUpDown, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/shared/user-avatar";
import { LogoMark } from "@/components/shared/logo";
import { Kbd } from "@/components/shared/kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toggleSidebar, useSidebarCollapsed } from "@/hooks/use-sidebar-collapsed";
import SidebarNav from "./sidebar-nav";
import SidebarUsage from "./sidebar-usage";
import UserMenuContent from "./user-menu";
import type { ItemTypeWithCount } from "@/lib/db/items";
import type { SidebarCollections } from "@/lib/db/collections";

interface User {
  id: string;
  name: string | null;
  email: string;
  image?: string | null;
}

interface SidebarProps {
  itemTypes: ItemTypeWithCount[];
  sidebarCollections: SidebarCollections;
  user: User | null;
  isPro?: boolean;
}

/**
 * The desktop sidebar. Its width follows `<html data-sidebar>` (`.app-sidebar`
 * in globals.css), so a collapsed rail is restored before first paint. Its head
 * holds the logo, the name and the collapse button (`[` too); the button fades
 * with the labels, and on the rail hovering the logo turns it into "expand".
 */
export default function Sidebar({ itemTypes, sidebarCollections, user, isPro }: SidebarProps) {
  const collapsed = useSidebarCollapsed();
  const itemCount = itemTypes.reduce((sum, type) => sum + type.count, 0);

  return (
    <aside className="app-sidebar flex h-full flex-col overflow-hidden border-r border-sidebar-border bg-sidebar">
      {/* Head: logo, name and the collapse button. On the rail the logo itself expands */}
      <div className="flex h-14 shrink-0 items-center gap-2 px-3">
        {/* The mark never re-mounts; only the control over it changes */}
        <div className="group/logo relative flex size-9 shrink-0 items-center justify-center">
          <LogoMark className="pointer-events-none transition-opacity duration-150 group-has-[button:hover]/logo:opacity-0 group-has-[button:focus-visible]/logo:opacity-0" />
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={toggleSidebar}
                  aria-label="Expand sidebar"
                  className="absolute inset-0 flex items-center justify-center rounded-lg text-lime opacity-0 outline-none transition-opacity duration-150 hover:bg-lime/10 hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-1 focus-visible:ring-lime/40"
                >
                  <PanelLeftOpen className="panel-anim h-[18px] w-[18px]" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="flex items-center gap-2.5">
                Expand sidebar
                <Kbd keys={["["]} />
              </TooltipContent>
            </Tooltip>
          ) : (
            <Link
              href="/dashboard"
              aria-label="BitBin dashboard"
              className="absolute inset-0 rounded-lg outline-none focus-visible:ring-1 focus-visible:ring-lime/40"
            />
          )}
        </div>
        <Link
          href="/dashboard"
          tabIndex={-1}
          aria-hidden
          className="sidebar-label min-w-0 whitespace-nowrap font-display text-lg font-bold tracking-tight"
        >
          Bit<span className="text-lime">Bin</span>
        </Link>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={toggleSidebar}
              tabIndex={collapsed ? -1 : undefined}
              aria-label="Collapse sidebar"
              className="sidebar-label ml-auto flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-lime/10 hover:text-lime focus-visible:ring-1 focus-visible:ring-lime/40"
            >
              <PanelLeftClose className="panel-anim h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="flex items-center gap-2.5">
            Collapse sidebar
            <Kbd keys={["["]} />
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Scrollable content */}
      <nav className="thin-scrollbar flex-1 overflow-y-auto overflow-x-hidden px-3 pt-3 pb-4">
        <SidebarNav itemTypes={itemTypes} sidebarCollections={sidebarCollections} />
      </nav>

      {!isPro && <SidebarUsage itemCount={itemCount} />}

      {/* User section at bottom */}
      <div className="border-t border-sidebar-border p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="sidebar-row relative flex w-full items-center gap-3 overflow-hidden whitespace-nowrap rounded-lg p-1.5 text-left transition-colors hover:bg-lime/[0.06] data-[state=open]:bg-lime/[0.12]">
              <UserAvatar name={user?.name} image={user?.image} />
              <div className="sidebar-label flex-1 overflow-hidden">
                <p className="flex items-center gap-1.5 truncate text-[13.5px] font-medium text-foreground">
                  <span className="truncate">{user?.name || "Guest"}</span>
                  {isPro && (
                    <span className="shrink-0 rounded-sm border border-lime/40 px-1 font-mono text-[9px] uppercase tracking-wide text-lime">
                      pro
                    </span>
                  )}
                </p>
                <p className="truncate text-xs text-muted-foreground">{user?.email || ""}</p>
              </div>
              <ChevronsUpDown className="sidebar-label h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <UserMenuContent isPro={isPro} />
        </DropdownMenu>
      </div>
    </aside>
  );
}

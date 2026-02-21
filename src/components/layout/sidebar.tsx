"use client";

import { PanelLeftClose, PanelLeft, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/shared/user-avatar";
import SidebarNav from "./sidebar-nav";
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
  isCollapsed: boolean;
  onToggle: () => void;
  itemTypes: ItemTypeWithCount[];
  sidebarCollections: SidebarCollections;
  user: User | null;
}

export default function Sidebar({
  isCollapsed,
  onToggle,
  itemTypes,
  sidebarCollections,
  user,
}: SidebarProps) {
  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
        isCollapsed ? "w-[68px]" : "w-64"
      )}
    >
      {/* Collapse toggle */}
      <div
        className={cn(
          "flex h-12 items-center px-3",
          isCollapsed ? "justify-center" : "justify-end"
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <PanelLeft className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Scrollable content */}
      <nav className="thin-scrollbar flex-1 overflow-y-auto overflow-x-hidden px-3 pb-4">
        <SidebarNav
          itemTypes={itemTypes}
          sidebarCollections={sidebarCollections}
          isCollapsed={isCollapsed}
        />
      </nav>

      {/* User section at bottom */}
      <div className="border-t border-sidebar-border p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {isCollapsed ? (
              <button className="flex w-full justify-center rounded-lg p-1 transition-colors hover:bg-sidebar-accent">
                <UserAvatar name={user?.name} image={user?.image} />
              </button>
            ) : (
              <button className="flex w-full items-center gap-3 rounded-lg p-1.5 text-left transition-colors hover:bg-sidebar-accent">
                <UserAvatar name={user?.name} image={user?.image} />
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-sm font-medium">
                    {user?.name || "Guest"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {user?.email || ""}
                  </p>
                </div>
                <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            )}
          </DropdownMenuTrigger>
          <UserMenuContent />
        </DropdownMenu>
      </div>
    </aside>
  );
}

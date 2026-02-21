"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronsUpDown } from "lucide-react";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Logo } from "@/components/shared/logo";
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

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  itemTypes: ItemTypeWithCount[];
  sidebarCollections: SidebarCollections;
  user: User | null;
}

export default function MobileSidebar({
  isOpen,
  onClose,
  itemTypes,
  sidebarCollections,
  user,
}: MobileSidebarProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="left" className="w-72 border-sidebar-border bg-sidebar p-0">
        <div className="flex h-full flex-col">
          {/* Header */}
          <SheetHeader className="border-b border-sidebar-border px-5 py-4">
            <SheetTitle className="text-left">
              <Logo />
            </SheetTitle>
          </SheetHeader>

          {/* Scrollable content */}
          <nav className="thin-scrollbar flex-1 overflow-y-auto px-3 py-4">
            <SidebarNav
              itemTypes={itemTypes}
              sidebarCollections={sidebarCollections}
              onLinkClick={onClose}
            />
          </nav>

          {/* User section at bottom */}
          <div className="border-t border-sidebar-border p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex w-full items-center gap-3 rounded-lg p-1.5 text-left hover:bg-sidebar-accent">
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
              </DropdownMenuTrigger>
              <UserMenuContent onNavigate={onClose} />
            </DropdownMenu>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

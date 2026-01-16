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
      <SheetContent side="left" className="w-64 p-0">
        <div className="flex h-full flex-col">
          {/* Header */}
          <SheetHeader className="border-b border-border p-4">
            <SheetTitle className="text-left text-sm font-medium text-muted-foreground">
              Navigation
            </SheetTitle>
          </SheetHeader>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-4">
            <SidebarNav
              itemTypes={itemTypes}
              sidebarCollections={sidebarCollections}
              onLinkClick={onClose}
            />
          </div>

          {/* User section at bottom */}
          <div className="border-t border-border p-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex w-full items-center gap-3 rounded-md p-1 hover:bg-accent">
                  <UserAvatar name={user?.name} image={user?.image} />
                  <div className="flex-1 overflow-hidden text-left">
                    <p className="truncate text-sm font-medium">
                      {user?.name || "Guest"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {user?.email || ""}
                    </p>
                  </div>
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

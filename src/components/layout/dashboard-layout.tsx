"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import TopBar from "@/components/layout/top-bar";
import StatusBar from "@/components/layout/status-bar";
import AppShortcuts from "@/components/layout/app-shortcuts";
import Sidebar from "@/components/layout/sidebar";
import MobileSidebar from "@/components/layout/mobile-sidebar";
import ItemDrawerProvider from "@/components/items/item-drawer-provider";
import ItemDrawer from "@/components/items/item-drawer";
import SearchProvider from "@/components/search/search-provider";
import CommandPalette from "@/components/search/command-palette";
import EditorPreferencesProvider from "@/components/settings/editor-preferences-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useButtonFill } from "@/hooks/use-motion";
import type { ItemTypeWithCount } from "@/lib/db/items";
import type { SidebarCollections } from "@/lib/db/collections";
import type { EditorPreferences } from "@/lib/constants/editor";

interface User {
  id: string;
  name: string | null;
  email: string;
  image?: string | null;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  itemTypes: ItemTypeWithCount[];
  sidebarCollections: SidebarCollections;
  user: User | null;
  editorPreferences?: EditorPreferences;
  isPro?: boolean;
}

export default function DashboardLayout({
  children,
  itemTypes,
  sidebarCollections,
  user,
  editorPreferences,
  isPro,
}: DashboardLayoutProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  // The shell stays mounted across pages; keying the content by path replays its entrance on each one
  const pathname = usePathname();
  useButtonFill();

  // Wrap content with EditorPreferencesProvider if preferences are provided
  const content = (
    <>
      {/* The page is a sheet with the landing sheets' rounded shoulder, laid over the sidebar's surface */}
      <div className="relative isolate flex min-w-0 flex-1 overflow-hidden border-t border-border bg-background lg:rounded-tl-[28px] lg:border-l">
        <main className="thin-scrollbar relative isolate flex-1 overflow-auto px-4 pt-6 pb-16 sm:px-6 lg:px-10 lg:pt-9">
          <div key={pathname} className="animate-page-in">{children}</div>
        </main>
      </div>
      <ItemDrawer />
      <CommandPalette />
    </>
  );

  return (
    <SearchProvider>
      <TooltipProvider>
        <div className="relative isolate flex h-dvh flex-col bg-sidebar">
          <div className="flex flex-1 overflow-hidden">
            {/* Desktop Sidebar: full height, with the logo in its head */}
            <div className="hidden lg:block">
              <Sidebar
                itemTypes={itemTypes}
                sidebarCollections={sidebarCollections}
                user={user}
                isPro={isPro}
              />
            </div>

            {/* Mobile Sidebar */}
            <MobileSidebar
              isOpen={isMobileSidebarOpen}
              onClose={() => setIsMobileSidebarOpen(false)}
              itemTypes={itemTypes}
              sidebarCollections={sidebarCollections}
              user={user}
              isPro={isPro}
            />

            <div className="relative flex min-w-0 flex-1 flex-col">
              <TopBar onMenuClick={() => setIsMobileSidebarOpen(true)} isPro={isPro} />
              <div className="flex flex-1 overflow-hidden">
                {/* Main Content */}
                <ItemDrawerProvider isPro={isPro}>
                  {editorPreferences ? (
                    <EditorPreferencesProvider initialPreferences={editorPreferences}>
                      {content}
                    </EditorPreferencesProvider>
                  ) : (
                    content
                  )}
                </ItemDrawerProvider>
              </div>
            </div>
          </div>
          <StatusBar itemTypes={itemTypes} isPro={isPro} />
          <AppShortcuts />
        </div>
      </TooltipProvider>
    </SearchProvider>
  );
}

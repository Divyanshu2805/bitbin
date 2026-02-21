"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronRight, LayoutGrid, Library, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { getItemTypeIcon } from "@/lib/constants/item-types";
import type { ItemTypeWithCount } from "@/lib/db/items";
import type { SidebarCollections } from "@/lib/db/collections";

interface SidebarNavProps {
  itemTypes: ItemTypeWithCount[];
  sidebarCollections: SidebarCollections;
  onLinkClick?: () => void;
  /** Icon-only rail used by the collapsed desktop sidebar */
  isCollapsed?: boolean;
}

const OVERVIEW_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/favorites", label: "Favorites", icon: Star },
  { href: "/collections", label: "Collections", icon: Library },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-1.5 px-2.5 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/70">
      {children}
    </h3>
  );
}

interface NavLinkProps {
  href: string;
  isActive: boolean;
  isCollapsed?: boolean;
  title?: string;
  onClick?: () => void;
  children: React.ReactNode;
}

/** Sidebar row with a lime indicator bar when active */
function NavLink({ href, isActive, isCollapsed, title, onClick, children }: NavLinkProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      title={isCollapsed ? title : undefined}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground",
        isCollapsed && "justify-center px-0 py-2",
        isActive && "bg-sidebar-accent font-medium text-foreground"
      )}
    >
      <span
        className={cn(
          "absolute -left-3 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-lime transition-all duration-300",
          isActive ? "opacity-100" : "scale-y-0 opacity-0"
        )}
      />
      {children}
    </Link>
  );
}

function Count({ value }: { value: number }) {
  return (
    <span className="ml-auto rounded-md bg-background/60 px-1.5 py-px font-mono text-[11px] tabular-nums text-muted-foreground">
      {value}
    </span>
  );
}

export default function SidebarNav({
  itemTypes,
  sidebarCollections,
  onLinkClick,
  isCollapsed = false,
}: SidebarNavProps) {
  const pathname = usePathname();
  const [collectionsExpanded, setCollectionsExpanded] = useState(true);

  return (
    <div className="space-y-6">
      {/* Overview */}
      <div className="space-y-0.5">
        {!isCollapsed && <SectionLabel>Overview</SectionLabel>}
        {OVERVIEW_LINKS.map(({ href, label, icon: Icon }) => (
          <NavLink
            key={href}
            href={href}
            isActive={pathname === href}
            isCollapsed={isCollapsed}
            title={label}
            onClick={onLinkClick}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!isCollapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </div>

      {/* Types */}
      <div className="space-y-0.5">
        {!isCollapsed && <SectionLabel>Types</SectionLabel>}
        {itemTypes.map((type) => {
          const Icon = getItemTypeIcon(type.icon);
          const href = `/items/${type.name}s`;
          const isProType = type.name === "file" || type.name === "image";

          return (
            <NavLink
              key={type.name}
              href={href}
              isActive={pathname === href}
              isCollapsed={isCollapsed}
              title={`${type.name}s`}
              onClick={onLinkClick}
            >
              <Icon
                className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110"
                style={{ color: type.color }}
              />
              {!isCollapsed && (
                <>
                  <span className="capitalize">{type.name}s</span>
                  {isProType && (
                    <span className="rounded bg-coral/15 px-1 font-mono text-[9px] font-bold uppercase tracking-wide text-coral">
                      Pro
                    </span>
                  )}
                  <Count value={type.count} />
                </>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Collections */}
      {!isCollapsed && (
        <div className="space-y-0.5">
          <button
            onClick={() => setCollectionsExpanded(!collectionsExpanded)}
            className="mb-1.5 flex w-full items-center gap-1 px-2.5 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/70 transition-colors hover:text-foreground"
            aria-expanded={collectionsExpanded}
          >
            <ChevronRight
              className={cn(
                "h-3 w-3 transition-transform duration-200",
                collectionsExpanded && "rotate-90"
              )}
            />
            Collections
          </button>

          {collectionsExpanded && (
            <div className="space-y-0.5 animate-fade-in">
              {sidebarCollections.favorites.map((collection) => (
                <NavLink
                  key={collection.id}
                  href={`/collections/${collection.id}`}
                  isActive={pathname === `/collections/${collection.id}`}
                  onClick={onLinkClick}
                >
                  <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />
                  <span className="flex-1 truncate">{collection.name}</span>
                  <Count value={collection.itemCount} />
                </NavLink>
              ))}

              {sidebarCollections.recents.map((collection) => (
                <NavLink
                  key={collection.id}
                  href={`/collections/${collection.id}`}
                  isActive={pathname === `/collections/${collection.id}`}
                  onClick={onLinkClick}
                >
                  <span
                    className="mx-[3px] h-2.5 w-2.5 shrink-0 rounded-[3px]"
                    style={{ backgroundColor: collection.dominantColor || "#6b7280" }}
                  />
                  <span className="flex-1 truncate">{collection.name}</span>
                  <Count value={collection.itemCount} />
                </NavLink>
              ))}

              {sidebarCollections.favorites.length === 0 &&
                sidebarCollections.recents.length === 0 && (
                  <p className="px-2.5 py-1.5 text-xs text-muted-foreground/70">
                    No collections yet.
                  </p>
                )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

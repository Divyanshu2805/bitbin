"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setItemCollection } from "@/actions/items";

// Dragging an item onto a collection adds it there. Items (cards, rows) are the
// drag sources; the sidebar's collections and collection cards are the targets.
// While a drag is on, <html> carries `item-dragging` so every target can show
// it takes a drop (globals.css: [data-collection-drop]).

const ITEM_MIME = "application/x-bitbin-item";

/**
 * What follows the pointer while dragging: a small frosted chip (the type in
 * its colour, then the title) instead of the browser's snapshot of the whole
 * card. Built off-screen, handed to setDragImage, then removed — browsers take
 * a flat picture of it, so the glass is a translucent fill and a soft shadow.
 */
function dragChip(title: string, type: string, color: string) {
  const chip = document.createElement("div");
  chip.style.cssText = [
    "position:fixed",
    "top:-1000px",
    "left:-1000px",
    "display:flex",
    "align-items:center",
    "gap:8px",
    "max-width:280px",
    "padding:7px 12px 7px 8px",
    "border-radius:10px",
    "border:1px solid color-mix(in srgb, var(--brand-lime) 55%, transparent)",
    "background:color-mix(in srgb, var(--card) 82%, transparent)",
    "box-shadow:0 10px 30px -10px color-mix(in srgb, var(--brand-lime) 55%, transparent), 0 2px 8px rgb(0 0 0 / 0.18)",
    "color:var(--foreground)",
    `font:600 13px ${getComputedStyle(document.body).fontFamily}`,
    "white-space:nowrap",
  ].join(";");

  const badge = document.createElement("span");
  badge.textContent = type;
  badge.style.cssText = [
    "flex-shrink:0",
    "padding:1px 6px",
    "border-radius:6px",
    `color:${color}`,
    `background:color-mix(in srgb, ${color} 15%, transparent)`,
    "font:500 11px var(--font-mono), monospace",
  ].join(";");

  const label = document.createElement("span");
  label.textContent = title;
  label.style.cssText = "overflow:hidden;text-overflow:ellipsis";

  chip.append(badge, label);
  document.body.appendChild(chip);
  return chip;
}

/** Props that make an item draggable onto collections. */
export function itemDragProps(itemId: string, title: string, type: string, color: string) {
  return {
    draggable: true,
    onDragStart: (event: React.DragEvent) => {
      event.dataTransfer.setData(ITEM_MIME, itemId);
      event.dataTransfer.setData("text/plain", title);
      event.dataTransfer.effectAllowed = "copy";
      const chip = dragChip(title, type, color);
      event.dataTransfer.setDragImage(chip, 14, 16);
      // The browser has its picture once this returns
      window.setTimeout(() => chip.remove(), 0);
      document.documentElement.classList.add("item-dragging");
    },
    onDragEnd: () => {
      document.documentElement.classList.remove("item-dragging");
    },
  };
}

/** Drop handlers for a collection: an item dropped here is added to it. */
export function useCollectionDrop(collectionId: string, collectionName: string) {
  const router = useRouter();
  const [over, setOver] = useState(false);

  const carriesItem = (event: React.DragEvent) => event.dataTransfer.types.includes(ITEM_MIME);

  return {
    "data-collection-drop": "",
    "data-drop-active": over ? "true" : undefined,
    onDragOver: (event: React.DragEvent) => {
      if (!carriesItem(event)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      if (!over) setOver(true);
    },
    onDragLeave: (event: React.DragEvent) => {
      // Moving onto a child counts as leaving the parent: only reset when truly out
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOver(false);
    },
    onDrop: async (event: React.DragEvent) => {
      if (!carriesItem(event)) return;
      event.preventDefault();
      setOver(false);
      document.documentElement.classList.remove("item-dragging");
      const itemId = event.dataTransfer.getData(ITEM_MIME);
      const result = await setItemCollection(itemId, collectionId, true);
      if (result.success && result.data) {
        toast.success(result.data.changed ? `Added to ${collectionName}` : `Already in ${collectionName}`);
        if (result.data.changed) router.refresh();
      } else {
        toast.error(result.error || "Couldn't add it to the collection");
      }
    },
  };
}

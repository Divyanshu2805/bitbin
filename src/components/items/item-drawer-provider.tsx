"use client";

import { createContext, useContext, useState, useCallback } from "react";
import type { ItemDetail } from "@/lib/db/items";

interface ItemDrawerContextValue {
  isOpen: boolean;
  item: ItemDetail | null;
  isLoading: boolean;
  isPro: boolean;
  openDrawer: (itemId: string) => void;
  closeDrawer: () => void;
  setItem: (item: ItemDetail) => void;
}

const ItemDrawerContext = createContext<ItemDrawerContextValue | null>(null);

export function useItemDrawer() {
  const context = useContext(ItemDrawerContext);
  if (!context) {
    throw new Error("useItemDrawer must be used within ItemDrawerProvider");
  }
  return context;
}

export default function ItemDrawerProvider({
  children,
  isPro = false,
}: {
  children: React.ReactNode;
  isPro?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [item, setItem] = useState<ItemDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const openDrawer = useCallback(async (itemId: string) => {
    setIsOpen(true);
    setIsLoading(true);
    setItem(null);

    try {
      const res = await fetch(`/api/items/${itemId}`);
      const json = await res.json();

      if (json.success && json.data) {
        setItem(json.data);
      }
    } catch (error) {
      console.error("Failed to fetch item:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const closeDrawer = useCallback(() => {
    setIsOpen(false);
    setItem(null);
  }, []);

  const updateItem = useCallback((updatedItem: ItemDetail) => {
    setItem(updatedItem);
  }, []);

  return (
    <ItemDrawerContext.Provider
      value={{ isOpen, item, isLoading, isPro, openDrawer, closeDrawer, setItem: updateItem }}
    >
      {children}
    </ItemDrawerContext.Provider>
  );
}

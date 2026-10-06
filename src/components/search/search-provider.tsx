"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { getSearchData, type SearchData } from "@/actions/search";

interface SearchContextValue {
  isOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;
  searchData: SearchData | null;
  isLoading: boolean;
  refreshSearchData: () => Promise<void>;
}

// Opening the palette refetches the index unless it was loaded this recently
const MIN_REFRESH_MS = 2000;

const SearchContext = createContext<SearchContextValue | null>(null);

export function useSearch() {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error("useSearch must be used within SearchProvider");
  }
  return context;
}

export default function SearchProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchData, setSearchData] = useState<SearchData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const lastFetchedAt = useRef(0);

  // `silent` keeps the current results on screen instead of showing the spinner
  const fetchSearchData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setIsLoading(true);
    try {
      const result = await getSearchData();
      if (result.success && result.data) {
        setSearchData(result.data);
        lastFetchedAt.current = Date.now();
      }
    } catch (error) {
      console.error("Failed to fetch search data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch search data on mount
  useEffect(() => {
    fetchSearchData();
  }, [fetchSearchData]);

  // Items change while the page stays mounted (create, edit, delete, import), so
  // reload the index each time the palette opens: what you just saved is found
  useEffect(() => {
    if (!isOpen) return;
    if (Date.now() - lastFetchedAt.current < MIN_REFRESH_MS) return;
    fetchSearchData({ silent: true });
  }, [isOpen, fetchSearchData]);

  // Listen for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const openSearch = useCallback(() => setIsOpen(true), []);
  const closeSearch = useCallback(() => setIsOpen(false), []);

  return (
    <SearchContext.Provider
      value={{
        isOpen,
        openSearch,
        closeSearch,
        searchData,
        isLoading,
        refreshSearchData: () => fetchSearchData(),
      }}
    >
      {children}
    </SearchContext.Provider>
  );
}

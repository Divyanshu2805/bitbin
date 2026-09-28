"use client";

import { useSyncExternalStore } from "react";
import { VIEW_STORAGE_KEY as STORAGE_KEY } from "./view-mode-script";

// Grid (cards) or list (rows) for every page that lists items or collections:
// one choice, kept in this browser. VIEW_SCRIPT (root layout <head>) copies it
// to <html data-view> before paint, and globals.css hides whichever layout
// doesn't match until React has rendered the right one, so list users never
// see the grid flash on load.

export type ViewMode = "grid" | "list";

const EVENT = "bitbin:view";

function read(): ViewMode {
  return document.documentElement.dataset.view === "list" ? "list" : "grid";
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}

export function setViewMode(mode: ViewMode) {
  document.documentElement.dataset.view = mode;
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Not kept past this page; still applies now
  }
  window.dispatchEvent(new Event(EVENT));
}

/** The current view; renders "grid" on the server, then the saved choice. */
export function useViewMode(): ViewMode {
  return useSyncExternalStore(subscribe, read, () => "grid");
}

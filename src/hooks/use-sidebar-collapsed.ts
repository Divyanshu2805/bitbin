"use client";

import { useSyncExternalStore } from "react";

// The desktop sidebar's collapsed state lives on `<html data-sidebar>`, which a
// tiny script in the root layout restores from localStorage before first paint
// (so the rail never flashes open). CSS reads the attribute for the layout;
// this hook exposes it to components that need it in JS (the toggle's icon).

const EVENT = "bitbin:sidebar";
const KEY = "bitbin:sidebar";

function isCollapsed() {
  return document.documentElement.dataset.sidebar === "collapsed";
}

function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback);
  return () => window.removeEventListener(EVENT, callback);
}

export function toggleSidebar() {
  const next = !isCollapsed();
  if (next) document.documentElement.dataset.sidebar = "collapsed";
  else delete document.documentElement.dataset.sidebar;
  try {
    if (next) localStorage.setItem(KEY, "collapsed");
    else localStorage.removeItem(KEY);
  } catch {
    // Storage can be unavailable (private mode); the toggle still works for this page
  }
  window.dispatchEvent(new Event(EVENT));
}

export function useSidebarCollapsed() {
  return useSyncExternalStore(subscribe, isCollapsed, () => false);
}

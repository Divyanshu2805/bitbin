"use client";

import { useEffect, useRef } from "react";

// Single-key app shortcuts (N, C, /). They never fire while the user is typing,
// while a dialog or menu is open, or with a modifier held, so they can't steal
// a keystroke meant for something else.

export function isTyping(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

export function overlayOpen() {
  return Boolean(document.querySelector('[role="dialog"], [role="menu"], [role="listbox"]'));
}

/**
 * Runs `handler` when `key` is pressed on its own. A page can override an
 * app-wide key by passing `{ override: true }`: its listener runs first (capture
 * phase) and marks the event handled, so the app-wide one skips it.
 */
export function useHotkey(key: string, handler: () => void, { override = false } = {}) {
  const latest = useRef(handler);
  useEffect(() => {
    latest.current = handler;
  });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== key || event.repeat || event.defaultPrevented) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTyping(event.target) || overlayOpen()) return;
      event.preventDefault();
      latest.current();
    };
    window.addEventListener("keydown", onKey, { capture: override });
    return () => window.removeEventListener("keydown", onKey, { capture: override });
  }, [key, override]);
}

"use client";

import { useEffect, useRef } from "react";

// The Cloudflare Turnstile bot check. It renders nothing when no site key is configured, so the
// forms work unchanged until the keys are set (see lib/turnstile.ts). A token is single use:
// change `resetKey` after a failed submit to ask for a fresh one.

export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
export const TURNSTILE_ENABLED = !!TURNSTILE_SITE_KEY && !TURNSTILE_SITE_KEY.startsWith("YOUR_");

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

interface TurnstileApi {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  remove: (widgetId: string) => void;
}

function getApi(): TurnstileApi | undefined {
  return (window as unknown as { turnstile?: TurnstileApi }).turnstile;
}

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (getApi()) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    const script = existing ?? document.createElement("script");
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("Turnstile failed to load")), { once: true });
    if (!existing) {
      script.src = SCRIPT_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
  });
}

interface TurnstileWidgetProps {
  /** Called with a token when the check passes, and with null when it expires or fails. */
  onToken: (token: string | null) => void;
  resetKey?: number;
}

export function TurnstileWidget({ onToken, resetKey = 0 }: TurnstileWidgetProps) {
  const container = useRef<HTMLDivElement>(null);
  const onTokenRef = useRef(onToken);

  useEffect(() => {
    onTokenRef.current = onToken;
  });

  useEffect(() => {
    if (!TURNSTILE_ENABLED || !container.current) return;
    const el = container.current;
    let widgetId: string | undefined;
    let cancelled = false;

    loadScript()
      .then(() => {
        const api = getApi();
        if (cancelled || !api) return;
        widgetId = api.render(el, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: "dark",
          callback: (token: string) => onTokenRef.current(token),
          "expired-callback": () => onTokenRef.current(null),
          "error-callback": () => onTokenRef.current(null),
        });
      })
      .catch(() => onTokenRef.current(null));

    return () => {
      cancelled = true;
      onTokenRef.current(null);
      if (widgetId) getApi()?.remove(widgetId);
    };
  }, [resetKey]);

  if (!TURNSTILE_ENABLED) return null;
  return <div ref={container} className="flex min-h-[65px] justify-center" aria-label="Verification check" />;
}

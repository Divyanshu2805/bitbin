"use client";

// Page slides between the homepage, the auth screens and the app, built on the
// browser's View Transitions API: the current page slides out to the left while
// the next one slides in from the right behind it. Signing out and going back run
// it the other way, left to right. The old page is held as a snapshot while the
// router swaps in the new one; the slide runs once the new page has settled.
// Browsers without the API, and visitors who prefer reduced motion, just navigate.
// Styles: globals.css (html.vt-slide, html.vt-back).

// The longest a slide waits for the next page before letting go.
const READY_TIMEOUT_MS = 5000;

let sliding = false;

type DocumentWithTransitions = Document & {
  startViewTransition?: (update: () => Promise<void> | void) => {
    finished: Promise<void>;
    ready: Promise<void>;
    updateCallbackDone: Promise<void>;
  };
};

// Timers, not animation frames: the browser pauses rendering while a transition's update runs.
const pause = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

/** No route loading screen (a `loading.tsx` marked `data-route-loading`) is showing */
const noLoadingScreen = () => !document.querySelector("[data-route-loading]");

async function waitUntil(ready: () => boolean) {
  const started = Date.now();
  await pause(30);
  while (!ready() && Date.now() - started < READY_TIMEOUT_MS) {
    await pause(40);
  }
  // One more beat so React has painted what it just committed.
  await pause(40);
}

function canSlide() {
  const doc = document as DocumentWithTransitions;
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  return Boolean(doc.startViewTransition) && !reduced && !sliding;
}

/**
 * Runs `go` (a router.push, or anything async ending in one) inside a page slide.
 * The slide waits until the address is `href`'s path and no loading screen is
 * showing, or until `ready` says so. `back` plays it the other way round.
 */
export function slideTo(
  go: () => unknown,
  href: string,
  { back = false, ready }: { back?: boolean; ready?: () => boolean } = {}
) {
  if (!canSlide()) {
    void go();
    return;
  }
  const target = new URL(href, window.location.href).pathname;
  const settled = ready ?? (() => window.location.pathname === target && noLoadingScreen());
  const root = document.documentElement;
  sliding = true;
  root.classList.add("vt-slide");
  root.classList.toggle("vt-back", back);

  const transition = (document as DocumentWithTransitions).startViewTransition!(async () => {
    try {
      await go();
    } finally {
      await waitUntil(settled);
    }
  });
  // A skipped or aborted transition still changes the page; nothing to report.
  transition.ready.catch(() => {});
  transition.finished
    .catch(() => {})
    .finally(() => {
      sliding = false;
      root.classList.remove("vt-slide", "vt-back");
    });
}

const isAuthPath = (path: string) => /^\/(sign-in|register)\/?$/.test(path);

// Popstate events re-sent for the router once a slide has started.
const replayed = new WeakSet<Event>();
let historyInstalled = false;

/**
 * The browser's Back and Forward buttons between the homepage and the sign-in
 * pages slide too: back to the homepage runs the slide in reverse, forward again
 * runs it as before. The popstate is held back from the router (this listener is
 * added first, in the capture phase) and re-sent from inside the slide, so the
 * router swaps the page while the old one is still pictured.
 */
export function slideOnHistoryMoves() {
  if (historyInstalled) return;
  historyInstalled = true;
  window.addEventListener(
    "popstate",
    (event) => {
      if (replayed.has(event) || !canSlide()) return;
      const to = window.location.pathname;
      const leavingAuth = Boolean(document.querySelector(".auth-page"));
      const leavingLanding = Boolean(document.querySelector(".landing"));
      let back: boolean;
      if (leavingAuth && to === "/") back = true;
      else if (leavingLanding && isAuthPath(to)) back = false;
      else return;

      event.stopImmediatePropagation();
      const arrived = back ? ".landing" : ".auth-page";
      slideTo(
        () => {
          const again = new PopStateEvent("popstate", { state: (event as PopStateEvent).state });
          replayed.add(again);
          window.dispatchEvent(again);
        },
        to,
        { back, ready: () => Boolean(document.querySelector(arrived)) }
      );
    },
    true
  );
}

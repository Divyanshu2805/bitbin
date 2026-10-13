"use client";

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/hooks/use-motion";

// Behind the hero's words (and the sign-in pages' brand panel): real footage of a screen at work, muted, looping and darkened so the
// headline stays readable. Served from public/hero (the CSP allows this site only). It plays for as
// long as it is on screen (through the whole pinned hero), holds on its first frame for reduced
// motion, pauses while the tab is hidden or it is scrolled out of sight, and disappears if the file
// is missing.
// The clip is slow footage; a little quicker reads as work happening
const PLAYBACK_RATE = 1.5;

export default function HeroVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    // React sets `muted` as a property only, and autoplay rules read it before playing
    video.muted = true;
    video.defaultPlaybackRate = video.playbackRate = PLAYBACK_RATE;
    let onScreen = true;
    const sync = () => {
      if (document.hidden || !onScreen || prefersReducedMotion()) video.pause();
      else video.play().catch(() => {});
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    // Under the sheets further down the page it would only cost frames
    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(([entry]) => {
            onScreen = entry.isIntersecting;
            sync();
          });
    observer?.observe(video);
    return () => {
      document.removeEventListener("visibilitychange", sync);
      observer?.disconnect();
    };
  }, []);

  if (failed) return null;

  return (
    <div aria-hidden className="hero-video">
      <video ref={ref} autoPlay muted loop playsInline preload="auto" onError={() => setFailed(true)}>
        <source src="/hero/desk.mp4" type="video/mp4" onError={() => setFailed(true)} />
      </video>
    </div>
  );
}

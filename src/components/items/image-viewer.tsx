"use client";

import { useState } from "react";
import Image from "next/image";
import { ExternalLink, Maximize2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { formatFileSize } from "@/lib/r2";

interface ImageViewerProps {
  src: string;
  alt: string;
  fileName?: string | null;
  fileSize?: number | null;
}

/**
 * An image item in the item panel: a stage that fills the height it's given
 * (the parent must have one), with the picture fitted inside over a faint
 * checkerboard so transparent PNGs read, and a bar underneath with the file's
 * name, pixel size and weight. Clicking the picture (or the expand button)
 * opens it full size in a lightbox, a nested dialog, so Esc or a click outside
 * closes only the lightbox and not the panel.
 */
export default function ImageViewer({ src, alt, fileName, fileSize }: ImageViewerProps) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [zoomed, setZoomed] = useState(false);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card">
      {/* The stage */}
      <button
        type="button"
        onClick={() => setZoomed(true)}
        aria-label="View full size"
        className="relative min-h-0 flex-1 cursor-zoom-in bg-[repeating-conic-gradient(var(--muted)_0_25%,transparent_0_50%)] bg-[length:18px_18px] outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-inset"
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 768px) 100vw, 1400px"
          className="object-contain p-4 drop-shadow-[0_12px_32px_rgb(0_0_0/0.25)]"
          onLoad={(e) => setSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
        />
      </button>

      {/* Details and actions */}
      <div className="flex shrink-0 items-center gap-3 border-t border-border bg-[var(--editor-chrome)] px-3 py-2 font-mono text-[11px] text-muted-foreground">
        <span className="min-w-0 truncate text-foreground/80">{fileName || alt}</span>
        {size && (
          <span className="shrink-0 tabular-nums">
            {size.w} × {size.h}
          </span>
        )}
        {fileSize ? <span className="shrink-0 tabular-nums">{formatFileSize(fileSize)}</span> : null}
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="panel-close"
            aria-label="Open original in a new tab"
            title="Open original"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <button type="button" onClick={() => setZoomed(true)} className="panel-close" aria-label="View full size" title="View full size">
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Lightbox: the picture at its full size (up to the window), on a dark backdrop */}
      <Dialog open={zoomed} onOpenChange={setZoomed}>
        <DialogContent
          className="grid h-dvh w-screen max-w-none cursor-zoom-out place-items-center rounded-none border-0 bg-black/85 p-6 shadow-none sm:max-w-none [&_.panel-close]:text-white"
          onClick={() => setZoomed(false)}
        >
          <DialogTitle className="sr-only">{alt}</DialogTitle>
          <DialogDescription className="sr-only">Full size image. Press Escape or click to close.</DialogDescription>
          {/* eslint-disable-next-line @next/next/no-img-element -- the full-resolution original, not a resized variant */}
          <img src={src} alt={alt} className="max-h-full max-w-full rounded-md object-contain shadow-2xl" />
        </DialogContent>
      </Dialog>
    </div>
  );
}

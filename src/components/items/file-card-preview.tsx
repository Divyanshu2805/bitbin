"use client";

import { useEffect, useRef, useState } from "react";
import { fileViewPath } from "@/lib/file-url";
import { EXCERPT_BYTES, excerptLines, filePreviewKind } from "@/lib/file-preview";

interface FileCardPreviewProps {
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
}

/** Turns `visible` on, for good, once the element first scrolls near the screen, so a page of cards doesn't fetch every file at once. */
function useWhenVisible<T extends Element>() {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || visible) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [visible]);

  return { ref, visible };
}

// The reader's worker, fonts and character maps are served from this site (public/pdfjs, copied by
// scripts/copy-pdfjs.mjs): the Content Security Policy allows no other origin.
const PDFJS_BASE = "/pdfjs/";

/** The first page of a PDF, drawn on a canvas and cropped to the top of the page. */
function PdfFirstPage({ src, name }: { src: string; name: string }) {
  const { ref, visible } = useWhenVisible<HTMLDivElement>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    let task: { destroy: () => Promise<void> } | null = null;

    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = `${PDFJS_BASE}pdf.worker.min.mjs`;
        const loading = pdfjs.getDocument({
          url: src,
          standardFontDataUrl: `${PDFJS_BASE}standard_fonts/`,
          cMapUrl: `${PDFJS_BASE}cmaps/`,
          cMapPacked: true,
          wasmUrl: `${PDFJS_BASE}wasm/`,
          iccUrl: `${PDFJS_BASE}iccs/`,
        });
        task = loading;
        const pdf = await loading.promise;
        const page = await pdf.getPage(1);
        const canvas = canvasRef.current;
        if (cancelled || !canvas) return;

        // Sharp on a high-density screen: draw at the tile's width times the pixel ratio
        const width = ref.current?.clientWidth || 360;
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: (width * (window.devicePixelRatio || 1)) / base.width });
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        await page.render({ canvas, viewport }).promise;
        if (!cancelled) setState("ready");
      } catch {
        // An optional preview: a PDF that can't be read leaves the card as it was
        if (!cancelled) setState("failed");
      } finally {
        // The canvas keeps the picture; the document and its worker aren't needed any more
        void task?.destroy().catch(() => undefined);
      }
    })();

    return () => {
      cancelled = true;
      void task?.destroy().catch(() => undefined);
    };
  }, [visible, src, ref]);

  if (state === "failed") return null;

  return (
    <div
      ref={ref}
      className="relative h-44 overflow-hidden rounded-xl border border-border bg-white"
      role="img"
      aria-label={`First page of ${name}`}
    >
      {state === "loading" && <div className="absolute inset-0 animate-pulse bg-muted" aria-hidden />}
      <canvas ref={canvasRef} className={state === "ready" ? "block w-full" : "hidden"} />
    </div>
  );
}

/** The first lines of a text file, in the same boxed tile as a snippet. */
function TextExcerpt({ src }: { src: string }) {
  const { ref, visible } = useWhenVisible<HTMLDivElement>();
  const [lines, setLines] = useState<string[] | null>(null);

  useEffect(() => {
    if (!visible) return;
    const controller = new AbortController();

    (async () => {
      try {
        const response = await fetch(src, { signal: controller.signal });
        if (!response.ok || !response.body) throw new Error(String(response.status));
        // Only the start of the file is read; the rest of the download is cancelled
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let text = "";
        let bytes = 0;
        while (bytes < EXCERPT_BYTES) {
          const { done, value } = await reader.read();
          if (done) break;
          bytes += value.length;
          text += decoder.decode(value, { stream: true });
        }
        controller.abort();
        setLines(excerptLines(text));
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) setLines([]);
      }
    })();

    return () => controller.abort();
  }, [visible, src]);

  if (lines && lines.length === 0) return null;

  return (
    <div
      ref={ref}
      className="overflow-hidden rounded-xl border border-border bg-background py-2 font-mono text-[12.5px] leading-[1.7]"
    >
      {lines === null ? (
        <div className="space-y-2 px-3 py-1" aria-hidden>
          {["w-2/3", "w-full", "w-3/4"].map((width) => (
            <div key={width} className={`h-3 animate-pulse rounded bg-muted ${width}`} />
          ))}
        </div>
      ) : (
        lines.map((line, index) => (
          <div key={index} className="flex whitespace-pre pr-3">
            <span className="w-9 shrink-0 select-none pr-2.5 text-right tabular-nums text-(--tone)">{index + 1}</span>
            <span className="min-w-0 truncate pl-2.5 text-foreground">{line}</span>
          </div>
        ))
      )}
    </div>
  );
}

/**
 * What a file item's card shows of its file: the first page of a PDF, or the first lines of a text
 * file. Nothing (the card stays as it was) for other types, a PDF too large to fetch for a card,
 * or a file that can't be read.
 */
export default function FileCardPreview({ fileUrl, fileName, fileSize }: FileCardPreviewProps) {
  const kind = filePreviewKind(fileName, fileSize);
  const src = fileViewPath(fileUrl);
  if (!kind || !src) return null;
  return kind === "pdf" ? <PdfFirstPage src={src} name={fileName || "file"} /> : <TextExcerpt src={src} />;
}

"use client";

import { useEffect, useState } from "react";
import { Download, File as FileIcon } from "lucide-react";
import { formatFileSize } from "@/lib/r2";
import CodeEditor from "./code-editor";
import MarkdownEditor from "./markdown-editor";

interface FileViewerProps {
  fileUrl: string;
  fileName?: string | null;
  fileSize?: number | null;
  onDownload: () => void;
}

// Text formats a file item can be, and the editor language to show each in
const TEXT_LANGUAGES: Record<string, string> = {
  txt: "plaintext",
  json: "json",
  yaml: "yaml",
  yml: "yaml",
  xml: "xml",
  csv: "plaintext",
  toml: "ini",
  ini: "ini",
};

// Past this many characters the preview is cut; the download has it all
const MAX_PREVIEW_CHARS = 200_000;

/** The file's key in storage (`{userId}/{timestamp}-{name}`), for /api/download. */
function storageKey(fileUrl: string) {
  try {
    return new URL(fileUrl).pathname.slice(1);
  } catch {
    return null;
  }
}

/**
 * A file item in the item panel, previewed in the height it's given (the parent
 * must have one): a PDF in the browser's viewer, Markdown rendered, and the
 * other text formats in the read-only code editor. Everything is loaded through
 * `/api/download/…?inline=1`, which checks ownership and serves anything but a
 * PDF as sandboxed plain text. A bar underneath names the file and downloads it.
 */
export default function FileViewer({ fileUrl, fileName, fileSize, onDownload }: FileViewerProps) {
  const name = fileName || "file";
  const ext = name.includes(".") ? name.split(".").pop()!.toLowerCase() : "";
  const key = storageKey(fileUrl);
  const src = key ? `/api/download/${key}?inline=1` : null;
  const isPdf = ext === "pdf";
  const isMarkdown = ext === "md";
  const textLanguage = TEXT_LANGUAGES[ext];
  const isText = isMarkdown || textLanguage !== undefined;

  const [text, setText] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!src || !isText) return;
    const controller = new AbortController();
    fetch(src, { signal: controller.signal })
      .then((res) => (res.ok ? res.text() : Promise.reject(new Error(String(res.status)))))
      .then((body) =>
        setText(body.length > MAX_PREVIEW_CHARS ? `${body.slice(0, MAX_PREVIEW_CHARS)}\n\n… (download for the rest)` : body)
      )
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) setFailed(true);
      });
    return () => controller.abort();
  }, [src, isText]);

  let preview: React.ReactNode;
  if (!src || failed || (!isPdf && !isText)) {
    preview = (
      <div className="grid h-full place-items-center p-6 text-center">
        <div className="space-y-2">
          <FileIcon className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {failed ? "Couldn't load a preview of this file." : "No preview for this kind of file."}
          </p>
        </div>
      </div>
    );
  } else if (isPdf) {
    preview = <iframe src={src} title={name} className="h-full w-full border-0 bg-white" />;
  } else if (text === null) {
    preview = (
      <div className="space-y-2.5 p-4" aria-label="Loading preview">
        {["w-2/3", "w-full", "w-5/6", "w-3/4", "w-1/2"].map((width, i) => (
          <div key={i} className={`h-3 animate-pulse rounded bg-muted ${width}`} />
        ))}
      </div>
    );
  } else if (isMarkdown) {
    preview = <MarkdownEditor value={text} readOnly fill />;
  } else {
    preview = <CodeEditor value={text} language={textLanguage} readOnly fill />;
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card">
      <div className={`min-h-0 flex-1 ${isText && text !== null ? "p-2" : ""}`}>{preview}</div>
      <div className="flex shrink-0 items-center gap-3 border-t border-border bg-[var(--editor-chrome)] px-3 py-2 font-mono text-[11px] text-muted-foreground">
        <FileIcon className="h-3.5 w-3.5 shrink-0" />
        <span className="min-w-0 truncate text-foreground/80">{name}</span>
        {fileSize ? <span className="shrink-0 tabular-nums">{formatFileSize(fileSize)}</span> : null}
        <button
          type="button"
          onClick={onDownload}
          className="panel-close ml-auto shrink-0"
          aria-label="Download file"
          title="Download"
        >
          <Download className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

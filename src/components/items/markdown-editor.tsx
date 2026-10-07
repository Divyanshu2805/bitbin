"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Eye, FileText, PenLine, Sparkles } from "lucide-react";
import { useClipboard } from "@/hooks/use-clipboard";
import EditorHeader from "./editor-header";
import { optimizePrompt } from "@/actions/ai";
import { toast } from "sonner";
import ProAiButton from "@/components/shared/pro-ai-button";

interface MarkdownEditorProps {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  // AI Optimize props (only for drawer read mode on prompts)
  showOptimize?: boolean;
  isPro?: boolean;
  title?: string;
  /** Saves the optimized version; resolves true once saved */
  onAcceptOptimized?: (optimized: string) => Promise<boolean> | boolean;
  /** Height range in px for the write area */
  minHeight?: number;
  maxHeight?: number;
  /** Fill the parent's height instead (the parent must have one) and scroll inside */
  fill?: boolean;
}

export default function MarkdownEditor({
  value,
  onChange,
  readOnly = false,
  placeholder = "Write your content here...",
  showOptimize = false,
  isPro = false,
  title = "",
  onAcceptOptimized,
  minHeight = 200,
  maxHeight = 400,
  fill = false,
}: MarkdownEditorProps) {
  const [activeTab, setActiveTab] = useState<
    "write" | "preview" | "original" | "optimized"
  >(readOnly ? "preview" : "write");
  const { copied, copy } = useClipboard();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Optimize state
  const [optimizedContent, setOptimizedContent] = useState<string | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const handleCopy = () => copy(activeTab === "optimized" && optimizedContent ? optimizedContent : value);

  // Auto-resize textarea based on content (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (textareaRef.current && activeTab === "write" && !fill) {
        textareaRef.current.style.height = "auto";
        const scrollHeight = textareaRef.current.scrollHeight;
        textareaRef.current.style.height = `${Math.min(Math.max(scrollHeight, minHeight), maxHeight)}px`;
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [value, activeTab, minHeight, maxHeight, fill]);

  const handleOptimize = async () => {
    if (!isPro) return;
    if (isOptimizing) return;

    setIsOptimizing(true);
    try {
      const result = await optimizePrompt({
        title,
        content: value,
      });

      if (result.success && result.data) {
        setOptimizedContent(result.data);
        setActiveTab("optimized");
      } else {
        toast.error(result.error || "Failed to optimize prompt");
      }
    } catch {
      toast.error("Failed to optimize prompt. Please try again.");
    } finally {
      setIsOptimizing(false);
    }
  };

  // Once saved, the optimized version is the content: drop the Original /
  // Optimized tabs and show it plainly. If the save fails, keep both.
  const [isAccepting, setIsAccepting] = useState(false);
  const handleAccept = async () => {
    if (!optimizedContent || !onAcceptOptimized || isAccepting) return;
    setIsAccepting(true);
    try {
      if (await onAcceptOptimized(optimizedContent)) {
        setOptimizedContent(null);
        setActiveTab(readOnly ? "preview" : "write");
      }
    } finally {
      setIsAccepting(false);
    }
  };

  // Calculate height based on content lines (for preview)
  const lineCount = value.split("\n").length;
  const lineHeight = 24;
  const padding = 32;
  const calculatedHeight = Math.min(
    Math.max(lineCount * lineHeight + padding, minHeight),
    maxHeight
  );

  // Determine tabs based on mode
  const showOptimizedTabs = showOptimize && optimizedContent !== null;

  let tabs;
  if (showOptimizedTabs) {
    tabs = [
      { id: "original", label: "Original", icon: FileText },
      { id: "optimized", label: "Optimized", icon: Sparkles },
    ];
  } else if (!readOnly) {
    tabs = [
      { id: "write", label: "Write", icon: PenLine },
      { id: "preview", label: "Preview", icon: Eye },
    ];
  } else {
    tabs = undefined;
  }

  // Build extra buttons for the header
  const extraButtons = showOptimize ? (
    <div className="flex items-center gap-2">
      {isPro && activeTab === "optimized" && optimizedContent && onAcceptOptimized && (
        <button
          type="button"
          onClick={handleAccept}
          disabled={isAccepting}
          className="flex items-center gap-1.5 text-sm disabled:opacity-50 text-emerald-700 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors"
          title="Use optimized prompt"
        >
          <Check className="h-3.5 w-3.5" />
          <span>{isAccepting ? "Saving…" : "Use This"}</span>
        </button>
      )}
      <ProAiButton
        isPro={isPro}
        label="Optimize"
        loadingLabel="Optimizing..."
        isLoading={isOptimizing}
        onClick={handleOptimize}
      />
    </div>
  ) : null;

  // Determine which content to show in the preview/readonly area
  const showingOptimized = activeTab === "optimized" && optimizedContent;
  const displayContent = showingOptimized ? optimizedContent : value;

  return (
    // `.editor-window`: while an editable editor has focus, its traffic lights
    // come on, an accent line runs along the top and the window glows
    <div
      data-editable={readOnly ? undefined : ""}
      className={`editor-window rounded-lg border border-border overflow-hidden bg-[var(--editor-bg)] ${fill ? "flex h-full flex-col" : ""}`}
    >
      <EditorHeader
        label="Markdown"
        copied={copied}
        onCopy={handleCopy}
        copyTitle="Copy content"
        tabs={tabs}
        activeTab={showOptimizedTabs ? activeTab : activeTab}
        onTabChange={(id) =>
          setActiveTab(id as "write" | "preview" | "original" | "optimized")
        }
        showDots={readOnly && !showOptimizedTabs}
        extraButtons={extraButtons}
      />

      {/* Content area */}
      {activeTab === "write" && !readOnly ? (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          className={`w-full bg-[var(--editor-bg)] text-foreground font-mono text-base p-4 resize-none focus:outline-none placeholder:text-faint dark:placeholder:text-muted-foreground/50 editor-scrollbar overflow-y-auto ${fill ? "min-h-0 flex-1" : ""}`}
          style={fill ? undefined : { minHeight: `${minHeight}px`, maxHeight: `${maxHeight}px` }}
        />
      ) : (
        // Filling: the text sits absolutely inside a box that fills the window, so
        // its length never sizes the layout; it scrolls inside instead
        <div className={fill ? "relative min-h-0 flex-1" : undefined}>
        <div
          className={`prose dark:prose-invert max-w-none prose-code:before:content-none prose-code:after:content-none prose-pre:border prose-pre:border-border prose-pre:bg-[var(--editor-chrome)] prose-pre:text-foreground p-4 overflow-y-auto editor-scrollbar ${fill ? "absolute inset-0" : ""}`}
          style={
            fill
              ? undefined
              : {
                  minHeight: `${minHeight}px`,
                  maxHeight: `${maxHeight}px`,
                  height: displayContent ? `${calculatedHeight}px` : `${minHeight}px`,
                }
          }
        >
          {displayContent ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {displayContent}
            </ReactMarkdown>
          ) : (
            <p className="text-faint dark:text-muted-foreground/50 text-sm italic">
              Nothing to preview
            </p>
          )}
        </div>
        </div>
      )}
    </div>
  );
}

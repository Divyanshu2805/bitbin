"use client";

import { useEffect, useRef, useState } from "react";
import Editor, { OnMount, loader, Monaco } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useClipboard } from "@/hooks/use-clipboard";
import EditorHeader from "./editor-header";
import { useEditorPreferences } from "@/components/settings/editor-preferences-provider";
import type { EditorTheme } from "@/lib/constants/editor";
import { explainCode } from "@/actions/ai";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import ProAiButton from "@/components/shared/pro-ai-button";
import { AgentSpinner, ResultLine, ToolLine } from "@/components/shared/agent-spinner";
import { explanationKey, getExplanation, getPendingExplanation, trackExplanation } from "@/lib/explanation-store";
import { Check, Code2, Copy, Sparkles } from "lucide-react";

// Configure Monaco to load from CDN
loader.config({
  paths: {
    vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs",
  },
});

// Define custom themes
function defineCustomThemes(monaco: Monaco) {
  // Monokai theme
  monaco.editor.defineTheme("monokai", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "88846f" },
      { token: "keyword", foreground: "f92672" },
      { token: "string", foreground: "e6db74" },
      { token: "number", foreground: "ae81ff" },
      { token: "type", foreground: "66d9ef" },
      { token: "function", foreground: "a6e22e" },
      { token: "variable", foreground: "f8f8f2" },
    ],
    colors: {
      "editor.background": "#272822",
      "editor.foreground": "#f8f8f2",
      "editor.lineHighlightBackground": "#3e3d32",
      "editorCursor.foreground": "#f8f8f0",
      "editor.selectionBackground": "#49483e",
    },
  });

  // GitHub Dark theme
  monaco.editor.defineTheme("github-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "8b949e" },
      { token: "keyword", foreground: "ff7b72" },
      { token: "string", foreground: "a5d6ff" },
      { token: "number", foreground: "79c0ff" },
      { token: "type", foreground: "ffa657" },
      { token: "function", foreground: "d2a8ff" },
      { token: "variable", foreground: "c9d1d9" },
    ],
    colors: {
      "editor.background": "#0d1117",
      "editor.foreground": "#c9d1d9",
      "editor.lineHighlightBackground": "#161b22",
      "editorCursor.foreground": "#c9d1d9",
      "editor.selectionBackground": "#264f78",
    },
  });

  // GitHub Light, used for every preference while the app is in light mode
  monaco.editor.defineTheme("github-light", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "comment", foreground: "6e7781" },
      { token: "keyword", foreground: "cf222e" },
      { token: "string", foreground: "0a3069" },
      { token: "number", foreground: "0550ae" },
      { token: "type", foreground: "953800" },
      { token: "function", foreground: "8250df" },
      { token: "variable", foreground: "24292f" },
    ],
    colors: {
      "editor.background": "#ffffff",
      "editor.foreground": "#24292f",
      "editor.lineHighlightBackground": "#f6f8fa",
      "editorLineNumber.foreground": "#8c959f",
      "editorCursor.foreground": "#24292f",
      "editor.selectionBackground": "#b6e3ff",
    },
  });
}

// Map theme names to Monaco theme names. The editor themes are all dark, so
// the light app theme overrides them with GitHub Light.
function getMonacoTheme(theme: EditorTheme, appTheme: string | undefined): string {
  if (appTheme === "light") return "github-light";
  const themeMap: Record<EditorTheme, string> = {
    "vs-dark": "vs-dark",
    monokai: "monokai",
    "github-dark": "github-dark",
  };
  return themeMap[theme];
}

// Below this width (px) the code and its explanation share one window
const SPLIT_MIN_WIDTH = 880;


interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  language?: string;
  readOnly?: boolean;
  // AI Explain props (only for drawer read mode)
  showExplain?: boolean;
  isPro?: boolean;
  title?: string;
  typeName?: string;
  /** Height range in px; the editor grows with its content between them */
  minHeight?: number;
  maxHeight?: number;
  /** Fill the parent's height instead (the parent must have one) and scroll inside */
  fill?: boolean;
  /** Told when Explain opens the explanation window, so the host can make room */
  onExplanationToggle?: (open: boolean) => void;
  /** Called after a paste with the editor's whole content (for language detection) */
  onPaste?: (value: string) => void;
}

export default function CodeEditor({
  value,
  onChange,
  language = "plaintext",
  readOnly = false,
  showExplain = false,
  isPro = false,
  title = "",
  typeName = "snippet",
  minHeight = 100,
  maxHeight = 400,
  fill = false,
  onExplanationToggle,
  onPaste,
}: CodeEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  // Monaco's paste listener is registered once on mount; this keeps it calling
  // the latest callback
  const onPasteRef = useRef(onPaste);
  useEffect(() => {
    onPasteRef.current = onPaste;
  }, [onPaste]);
  const { copied, copy } = useClipboard();
  const { preferences } = useEditorPreferences();
  const { resolvedTheme } = useTheme();

  // Explain: the explanation opens in its own window beside the code and stays
  // (for this item, this session) until Explain is pressed again
  // Kept in this browser (lib/explanation-store) by title + code, so it's still
  // there after closing the item or reloading; a request still in flight when
  // the item was closed is picked up again on reopening.
  const cacheKey = explanationKey(title, value);
  const [explanation, setExplanation] = useState<string | null>(() =>
    showExplain ? getExplanation(cacheKey) : null
  );
  const [isExplaining, setIsExplaining] = useState(() => showExplain && getPendingExplanation(cacheKey) !== undefined);

  useEffect(() => {
    if (!showExplain) return;
    const request = getPendingExplanation(cacheKey);
    if (!request) return;
    let live = true;
    request.then((text) => {
      if (!live) return;
      if (text) setExplanation(text);
      setIsExplaining(false);
    });
    return () => {
      live = false;
    };
  }, [showExplain, cacheKey]);
  const { copied: explanationCopied, copy: copyExplanation } = useClipboard();

  // Side by side needs room; narrower than SPLIT_MIN_WIDTH the two windows
  // merge into one with Code | Explanation tabs
  const rootRef = useRef<HTMLDivElement>(null);
  const [wide, setWide] = useState(true);
  const [mergedView, setMergedView] = useState<"code" | "explain">("explain");
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWide(entry.contentRect.width >= SPLIT_MIN_WIDTH));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);


  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    editor.onDidPaste(() => onPasteRef.current?.(editor.getValue()));
    // Define custom themes when Monaco mounts
    defineCustomThemes(monaco);
    // Apply the selected theme
    monaco.editor.setTheme(getMonacoTheme(preferences.theme, resolvedTheme));
  };

  const handleCopy = () => copy(value);

  // The host expands first; the explanation window pops in beside the code with
  // a loading state, and the answer lands there. Pressing it again re-explains.
  const handleExplain = async () => {
    if (!isPro) return;
    if (isExplaining) return;

    onExplanationToggle?.(true);
    setMergedView("explain");
    setIsExplaining(true);
    const text = await trackExplanation(cacheKey, async () => {
      try {
        const result = await explainCode({
          title,
          content: value,
          language: language || null,
          typeName: typeName as "snippet" | "command",
        });
        if (result.success && result.data) return result.data;
        toast.error(result.error || "Failed to explain code");
      } catch {
        toast.error("Failed to explain code. Please try again.");
      }
      return null;
    });
    if (text) setExplanation(text);
    setIsExplaining(false);
  };

  // Map common language aliases to Monaco language IDs
  const getMonacoLanguage = (lang: string): string => {
    const languageMap: Record<string, string> = {
      js: "javascript",
      ts: "typescript",
      py: "python",
      rb: "ruby",
      sh: "shell",
      bash: "shell",
      zsh: "shell",
      yml: "yaml",
      md: "markdown",
      jsx: "javascript",
      tsx: "typescript",
    };
    return languageMap[lang.toLowerCase()] || lang.toLowerCase();
  };

  const monacoLanguage = getMonacoLanguage(language);
  const displayLanguage = language || "plaintext";

  // Calculate height based on content lines (fluid height with max)
  const lineCount = value.split("\n").length;
  // Calculate line height based on font size (roughly 1.5x the font size)
  const lineHeight = Math.round(preferences.fontSize * 1.5);
  const padding = 16; // Top and bottom padding
  const calculatedHeight = Math.min(
    Math.max(lineCount * lineHeight + padding, minHeight),
    maxHeight
  );

  // Build extra buttons for the header
  const extraButtons = showExplain ? (
    <ProAiButton
      isPro={isPro}
      label={explanation ? "Explain again" : "Explain"}
      loadingLabel="Drafting…"
      isLoading={isExplaining}
      onClick={handleExplain}
    />
  ) : null;

  const showExplanation = showExplain && (explanation !== null || isExplaining);
  const merged = showExplanation && !wide;
  const showingExplanation = merged && mergedView === "explain";

  const copyButton = (
    <button
      type="button"
      onClick={() => explanation && copyExplanation(explanation)}
      disabled={isExplaining || !explanation}
      className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
      title="Copy explanation"
    >
      {explanationCopied ? <Check className="h-3.5 w-3.5 text-lime" /> : <Copy className="h-3.5 w-3.5" />}
      {explanationCopied ? "Copied" : "Copy"}
    </button>
  );
  // The explanation text sits absolutely inside a box that fills its window, so
  // its length never sizes the layout: it matches the code's height and scrolls
  // While it's drafting: a CLI agent at work — the step it took, then the
  // breathing spinner with a rotating verb and the seconds so far
  const explanationBody = isExplaining ? (
    <div className={`space-y-3 p-4 ${fill ? "min-h-0 flex-1" : ""}`} aria-live="polite">
      <ToolLine name="Read" args={`${title || "snippet"} · ${lineCount} ${lineCount === 1 ? "line" : "lines"}`} />
      <ResultLine>{displayLanguage}</ResultLine>
      <AgentSpinner
        verb={["Drafting response", "Reading the code", "Tracing the logic", "Drafting response"]}
        timer
        className="pt-1"
      />
      <div className="space-y-2.5 pt-2 opacity-60">
        {["w-2/3", "w-full", "w-5/6", "w-1/2"].map((width, i) => (
          <div key={i} className={`h-2.5 rounded bg-muted animate-pulse ${width}`} style={{ animationDelay: `${i * 150}ms` }} />
        ))}
      </div>
    </div>
  ) : explanation ? (
    <div className={fill ? "relative min-h-0 flex-1" : undefined}>
      <div
        className={`prose prose-sm max-w-none p-4 dark:prose-invert overflow-y-auto editor-scrollbar prose-headings:tracking-tight prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:font-normal prose-code:before:content-none prose-code:after:content-none prose-pre:border prose-pre:border-border prose-pre:bg-[var(--editor-chrome)] prose-pre:text-foreground [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-inherit ${fill ? "absolute inset-0" : ""}`}
        style={fill ? undefined : { maxHeight: `${maxHeight}px` }}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{explanation}</ReactMarkdown>
      </div>
    </div>
  ) : null;

  const codeWindow = (
    // `.editor-window`: while an editable editor has focus, its traffic lights
    // come on, an accent line runs along the top and the window glows
    <div
      data-editable={readOnly ? undefined : ""}
      className={`editor-window min-w-0 overflow-hidden rounded-lg border border-border bg-[var(--editor-bg)] ${fill ? "flex h-full flex-1 flex-col" : ""}`}
    >
      <EditorHeader
        label={showingExplanation ? "" : displayLanguage}
        copied={showingExplanation ? explanationCopied : copied}
        onCopy={showingExplanation ? () => explanation && copyExplanation(explanation) : handleCopy}
        copyTitle={showingExplanation ? "Copy explanation" : "Copy code"}
        tabs={
          merged
            ? [
                { id: "code", label: "Code", icon: Code2 },
                { id: "explain", label: "Explanation", icon: Sparkles },
              ]
            : undefined
        }
        activeTab={mergedView}
        onTabChange={(id) => setMergedView(id as "code" | "explain")}
        showDots={!merged}
        extraButtons={
          merged && showingExplanation ? null : extraButtons
        }
      />
      {/* Kept mounted while the explanation tab is showing, so switching back is instant */}
      <div className={`${fill ? "min-h-0 flex-1" : ""} ${showingExplanation ? "hidden" : ""}`}>
        <Editor
          height={fill ? "100%" : calculatedHeight}
          language={monacoLanguage}
          value={value}
          onChange={(val) => onChange?.(val ?? "")}
          onMount={handleEditorMount}
          theme={getMonacoTheme(preferences.theme, resolvedTheme)}
          options={{
            readOnly,
            minimap: { enabled: preferences.minimap },
            scrollBeyondLastLine: false,
            fontSize: preferences.fontSize,
            tabSize: preferences.tabSize,
            lineHeight: lineHeight,
            padding: { top: 8, bottom: 8 },
            lineNumbers: "on",
            lineNumbersMinChars: 3,
            renderLineHighlight: readOnly ? "none" : "line",
            cursorStyle: readOnly ? "underline" : "line",
            scrollbar: {
              vertical: "auto",
              horizontal: "auto",
              verticalScrollbarSize: 10,
              horizontalScrollbarSize: 10,
              useShadows: false,
            },
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            overviewRulerBorder: false,
            wordWrap: preferences.wordWrap ? "on" : "off",
            folding: false,
            contextmenu: !readOnly,
            domReadOnly: readOnly,
            // Re-measure when the panel animates open or resizes (a sheet or dialog
            // mounts it before its final size, which left it blank)
            automaticLayout: true,
          }}
        />
      </div>
      {showingExplanation && explanationBody}
    </div>
  );

  // With room: code and explanation side by side, each in its own window.
  // Without: one window with tabs (above). The wrapper is always there so its
  // width can be measured.
  return (
    <div
      ref={rootRef}
      className={
        fill
          ? `flex h-full min-h-0 gap-4 ${showExplanation && wide ? "flex-row" : "flex-col"}`
          : "flex flex-col gap-4"
      }
    >
      {codeWindow}
      {showExplanation && wide && (
        <section
          aria-label="Explanation"
          className={`min-w-0 overflow-hidden rounded-lg border border-[color-mix(in_srgb,var(--brand-violet)_35%,var(--border))] bg-[var(--editor-bg)] animate-[explain-in_0.5s_cubic-bezier(0.22,1,0.36,1)_0.15s_both] ${fill ? "flex min-h-0 flex-1 flex-col" : ""}`}
        >
          <div className="flex items-center justify-between gap-3 border-b border-border bg-[var(--editor-chrome)] px-4 py-2">
            <span className="flex items-center gap-2 text-sm font-medium text-[var(--brand-violet)]">
              <Sparkles className="h-4 w-4" />
              Explanation
            </span>
            {copyButton}
          </div>
          {explanationBody}
        </section>
      )}
    </div>
  );
}

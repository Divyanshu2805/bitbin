"use client";

import { useState, useEffect, useRef } from "react";
import { MAX_DESCRIPTION_LENGTH } from "@/lib/validation";
import { DescriptionCount } from "./description-count";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Lock, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { readableColor } from "@/lib/utils/color";
import { createItem } from "@/actions/items";
import type { CreateItemInput } from "@/lib/item-create";
import { getUserCollections } from "@/actions/collections";
import { getItemTypeIcon, ITEM_TYPE_COLORS } from "@/lib/constants/item-types";
import LanguagePicker from "./language-picker";
import { detectLanguage } from "@/lib/detect-language";
import { Kbd } from "@/components/shared/kbd";
import CodeEditor from "./code-editor";
import MarkdownEditor from "./markdown-editor";
import FileUpload from "./file-upload";
import CollectionPicker, { type CollectionOption } from "./collection-picker";
import SuggestTagsButton from "./suggest-tags-button";
import GenerateDescriptionButton from "./generate-description-button";

interface NewItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: ItemTypeName;
  isPro?: boolean;
}

export type ItemTypeName = "snippet" | "prompt" | "command" | "note" | "link" | "file" | "image";

const ITEM_TYPES: { value: ItemTypeName; label: string; icon: string; isPro?: boolean }[] = [
  { value: "snippet", label: "Snippet", icon: "Code" },
  { value: "prompt", label: "Prompt", icon: "Sparkles" },
  { value: "command", label: "Command", icon: "Terminal" },
  { value: "note", label: "Note", icon: "StickyNote" },
  { value: "link", label: "Link", icon: "Link" },
  { value: "file", label: "File", icon: "File", isPro: true },
  { value: "image", label: "Image", icon: "Image", isPro: true },
];

const CONTENT_LABEL: Partial<Record<ItemTypeName, string>> = {
  snippet: "code",
  command: "command",
  prompt: "prompt",
  note: "note",
};

/** `// title` field labels, in the app's code-comment voice. */
function FieldLabel({ htmlFor, children, required }: { htmlFor?: string; children: React.ReactNode; required?: boolean }) {
  return (
    <Label htmlFor={htmlFor} className="font-mono text-xs font-medium text-foreground/85">
      <span className="text-muted-foreground">{"// "}</span>
      {children}
      {required && <span className="text-coral">*</span>}
    </Label>
  );
}

/** Tags as chips: type and press Enter or comma to add, Backspace on empty removes the last. */
function TagInput({
  tags,
  onChange,
  disabled,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState("");

  const add = (raw: string) => {
    const next = raw
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t && !tags.includes(t));
    if (next.length) onChange([...tags, ...next]);
    setDraft("");
  };

  return (
    <div
      className={cn(
        "field-frame flex min-h-10 flex-wrap items-center gap-1.5 rounded-md border border-input bg-background/60 px-2 py-1.5 transition-[border-color,background-color] hover:border-foreground/20 focus-within:border-ring/50 focus-within:bg-background/80",
        disabled && "opacity-60"
      )}
    >
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded border border-border bg-card px-1.5 py-0.5 font-mono text-xs text-foreground/85"
        >
          <span className="text-muted-foreground">#</span>
          {tag}
          <button
            type="button"
            onClick={() => onChange(tags.filter((t) => t !== tag))}
            className="text-muted-foreground transition-colors hover:text-destructive"
            aria-label={`Remove ${tag}`}
            disabled={disabled}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        id="tags"
        value={draft}
        disabled={disabled}
        onChange={(e) => {
          const value = e.target.value;
          if (value.includes(",")) add(value);
          else setDraft(value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && draft.trim()) {
            e.preventDefault();
            add(draft);
          } else if (e.key === "Backspace" && !draft && tags.length) {
            onChange(tags.slice(0, -1));
          }
        }}
        onBlur={() => draft.trim() && add(draft)}
        placeholder={tags.length ? "" : "react, hooks…"}
        className="min-w-[6rem] flex-1 bg-transparent px-1 text-base outline-none lg:text-sm placeholder:text-faint dark:placeholder:text-muted-foreground/65"
      />
    </div>
  );
}

/**
 * Create an item. A fixed frame (header, type switcher, footer) around a body
 * that scrolls on its own, so nothing is ever pushed off screen however long the
 * content gets. On wide screens the body splits: title and content on the left,
 * description, tags and collections in a side panel. Full-screen on phones.
 * ⌘/Ctrl+Enter creates.
 */
export default function NewItemDialog({ open, onOpenChange, defaultType, isPro }: NewItemDialogProps) {
  const router = useRouter();
  const titleRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [typeName, setTypeName] = useState<ItemTypeName>(defaultType || "snippet");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [language, setLanguage] = useState("");
  // Where the language came from: a paste sets it until the user picks one
  const [languageSource, setLanguageSource] = useState<"none" | "auto" | "user">("none");
  const [tags, setTags] = useState<string[]>([]);
  const [fileData, setFileData] = useState<{
    fileUrl: string;
    fileName: string;
    fileSize: number;
  } | null>(null);
  const [collections, setCollections] = useState<CollectionOption[]>([]);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>([]);

  // Fetch collections when dialog opens
  useEffect(() => {
    if (open) {
      getUserCollections().then((result) => {
        if (result.success && result.data) {
          setCollections(result.data);
        }
      });
    }
  }, [open]);

  // Sync typeName when defaultType changes (e.g., opening from different type pages)
  useEffect(() => {
    if (defaultType) {
      setTypeName(defaultType);
    }
  }, [defaultType]);

  const resetForm = () => {
    setTypeName(defaultType || "snippet");
    setTitle("");
    setDescription("");
    setContent("");
    setUrl("");
    setLanguage("");
    setLanguageSource("none");
    setTags([]);
    setFileData(null);
    setSelectedCollectionIds([]);
  };

  const pickLanguage = (value: string) => {
    setLanguage(value);
    setLanguageSource("user");
  };

  const detectPastedLanguage = (value: string) => {
    if (languageSource === "user") return;
    const detected = detectLanguage(value, typeName);
    if (detected) {
      setLanguage(detected);
      setLanguageSource("auto");
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      resetForm();
      onOpenChange(false);
    }
  };

  const selectedType = ITEM_TYPES.find((t) => t.value === typeName);
  const IconComponent = selectedType ? getItemTypeIcon(selectedType.icon) : null;
  const color = readableColor(ITEM_TYPE_COLORS[typeName]);
  const showContentField = ["snippet", "prompt", "command", "note"].includes(typeName);
  const showLanguageField = ["snippet", "command"].includes(typeName);
  const showUrlField = typeName === "link";
  const showFileUpload = typeName === "file" || typeName === "image";
  const needsFile = showFileUpload && !fileData;
  const canSubmit = title.trim().length > 0 && !(showUrlField && !url.trim()) && !needsFile && !isLoading;

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!canSubmit) {
      if (!title.trim()) titleRef.current?.focus();
      else if (needsFile) toast.error("Please upload a file");
      return;
    }
    setIsLoading(true);

    try {
      const input: CreateItemInput = {
        typeName,
        title,
        description: description || null,
        content: content || null,
        url: url || null,
        language: language || null,
        tags,
        collectionIds: selectedCollectionIds.length > 0 ? selectedCollectionIds : undefined,
        fileUrl: fileData?.fileUrl || null,
        fileName: fileData?.fileName || null,
        fileSize: fileData?.fileSize || null,
      };

      const result = await createItem(input);

      if (result.success) {
        toast.success(`${selectedType?.label ?? "Item"} saved to your bin`);
        resetForm();
        onOpenChange(false);
        router.refresh();
      } else if (result.fieldErrors) {
        const firstError = Object.values(result.fieldErrors)[0]?.[0];
        toast.error(firstError || result.error || "Failed to create item");
      } else {
        toast.error(result.error || "Failed to create item");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className={cn(
          "flex flex-col gap-0 overflow-hidden p-0",
          "h-dvh max-h-dvh w-full max-w-full rounded-none border-0",
          "sm:h-[min(90dvh,820px)] sm:max-w-[min(calc(100%-2rem),76rem)] sm:rounded-xl sm:border"
        )}
        style={{ "--grid-color": "var(--brand-lime)", "--ring": "var(--brand-lime)" } as React.CSSProperties}
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          titleRef.current?.focus();
        }}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            handleSubmit();
          }
        }}
      >
        {/* Header */}
        <header className="relative shrink-0 border-b border-border px-5 pt-5 pb-4 pr-12">
          <span
            aria-hidden
            className="absolute inset-x-0 top-0 h-[2px] transition-colors"
            style={{ background: "linear-gradient(90deg, var(--brand-lime), transparent 70%)" }}
          />
          <p className="font-mono text-[11px] text-muted-foreground">
            <span className="text-lime">~/</span>items/{typeName}s/<span className="text-foreground/70">new</span>
          </p>
          <DialogTitle data-anim-icons className="mt-1.5 flex items-center gap-2.5 font-display text-xl font-bold tracking-[-0.03em]">
            {IconComponent && (
              <span
                className="flex h-8 w-8 items-center justify-center rounded-lg border transition-colors"
                style={{
                  color,
                  backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
                  borderColor: `color-mix(in srgb, ${color} 30%, transparent)`,
                }}
              >
                <IconComponent className="h-4 w-4" />
              </span>
            )}
            New {typeName}
          </DialogTitle>
          <DialogDescription className="sr-only">Create a new {typeName} in your bin.</DialogDescription>
        </header>

        {/* Type switcher */}
        <div
          role="radiogroup"
          aria-label="Item type"
          className="thin-scrollbar flex shrink-0 gap-1.5 overflow-x-auto border-b border-border bg-surface/60 px-5 py-2.5"
        >
          {ITEM_TYPES.map((type) => {
            const Icon = getItemTypeIcon(type.icon);
            const typeColor = readableColor(ITEM_TYPE_COLORS[type.value]);
            const active = type.value === typeName;
            const locked = type.isPro && !isPro;
            return (
              <button
                key={type.value}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={locked || isLoading}
                title={locked ? `${type.label}s are part of BitBin Pro` : undefined}
                onClick={() => setTypeName(type.value)}
                className={cn(
                  "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-2.5 font-mono text-xs transition-colors",
                  active
                    ? "text-foreground"
                    : "border-transparent text-muted-foreground hover:border-[color-mix(in_srgb,var(--type-color)_28%,transparent)] hover:bg-[color-mix(in_srgb,var(--type-color)_8%,transparent)] hover:text-(--type-color)",
                  locked && "cursor-not-allowed opacity-50 hover:border-transparent hover:bg-transparent hover:text-muted-foreground"
                )}
                // --type-color tints the chip on hover; the chosen one is filled with it
                style={
                  {
                    "--type-color": typeColor,
                    ...(active && {
                      borderColor: `color-mix(in srgb, ${typeColor} 45%, transparent)`,
                      backgroundColor: `color-mix(in srgb, ${typeColor} 12%, transparent)`,
                    }),
                  } as React.CSSProperties
                }
              >
                <Icon className="h-3.5 w-3.5" style={{ color: typeColor }} />
                {type.label.toLowerCase()}
                {locked && <Lock className="h-3 w-3" />}
              </button>
            );
          })}
        </div>

        {/* Body: the only part that scrolls */}
        <form
          id="new-item-form"
          onSubmit={handleSubmit}
          className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto thin-scrollbar md:grid-cols-[minmax(0,1fr)_20rem] md:grid-rows-[minmax(0,1fr)] md:overflow-hidden"
        >
          {/* Main column */}
          <div className="flex min-w-0 flex-col gap-5 px-5 py-5 thin-scrollbar md:overflow-y-auto">
            <div className="space-y-2">
              <FieldLabel htmlFor="title" required>
                title
              </FieldLabel>
              <Input
                ref={titleRef}
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  typeName === "command"
                    ? "Tail pod logs"
                    : typeName === "link"
                      ? "Radix UI docs"
                      : typeName === "prompt"
                        ? "Code review assistant"
                        : "useDebounce hook"
                }
                maxLength={200}
                disabled={isLoading}
                className="h-11 text-base font-medium"
              />
            </div>

            {showContentField && (
              <div className="flex min-h-[320px] flex-1 flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <FieldLabel htmlFor="content">{CONTENT_LABEL[typeName]}</FieldLabel>
                  {showLanguageField && (
                    <LanguagePicker
                      value={language}
                      onChange={pickLanguage}
                      detected={languageSource === "auto"}
                      disabled={isLoading}
                    />
                  )}
                </div>
                {/* Fills the column down to the footer, then scrolls inside */}
                <div className="min-h-0 flex-1">
                  {showLanguageField ? (
                    <CodeEditor
                      value={content}
                      onChange={setContent}
                      onPaste={detectPastedLanguage}
                      language={language || "plaintext"}
                      fill
                    />
                  ) : (
                    <MarkdownEditor
                      value={content}
                      onChange={setContent}
                      placeholder={
                        typeName === "prompt" ? "You are a senior engineer reviewing…" : "Write your note in Markdown…"
                      }
                      fill
                    />
                  )}
                </div>
              </div>
            )}

            {showUrlField && (
              <div className="space-y-2">
                <FieldLabel htmlFor="url" required>
                  url
                </FieldLabel>
                <Input
                  id="url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  disabled={isLoading}
                  className="h-11 font-mono text-base lg:text-sm"
                />
              </div>
            )}

            {showFileUpload && (
              <div className="space-y-2">
                <FieldLabel required>{typeName}</FieldLabel>
                <FileUpload
                  itemType={typeName as "file" | "image"}
                  onUploadComplete={setFileData}
                  onUploadError={(error) => toast.error(error)}
                  disabled={isLoading}
                />
              </div>
            )}
          </div>

          {/* Details panel */}
          <aside className="min-w-0 space-y-5 border-t border-border bg-surface/40 px-5 py-5 thin-scrollbar md:overflow-y-auto md:border-t-0 md:border-l">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <FieldLabel htmlFor="description">description</FieldLabel>
                {isPro && (
                  <GenerateDescriptionButton
                    title={title}
                    content={content || null}
                    url={url || null}
                    language={language || null}
                    typeName={typeName}
                    onGenerated={setDescription}
                    disabled={isLoading}
                  />
                )}
              </div>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is it, and when do you reach for it?"
                rows={4}
                maxLength={MAX_DESCRIPTION_LENGTH}
                disabled={isLoading}
                className="max-h-48 resize-none text-base lg:text-sm"
              />
              <DescriptionCount length={description.length} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <FieldLabel htmlFor="tags">tags</FieldLabel>
                {isPro && (
                  <SuggestTagsButton
                    title={title}
                    content={content || null}
                    language={language || null}
                    typeName={typeName}
                    existingTags={tags}
                    onAcceptTag={(tag) => setTags((prev) => (prev.includes(tag) ? prev : [...prev, tag]))}
                    disabled={isLoading}
                  />
                )}
              </div>
              <TagInput tags={tags} onChange={setTags} disabled={isLoading} />
              <p className="font-mono text-[11px] text-muted-foreground">enter or comma to add</p>
            </div>

            <div className="space-y-2">
              <FieldLabel>collections</FieldLabel>
              {collections.length > 0 ? (
                <CollectionPicker
                  collections={collections}
                  selectedIds={selectedCollectionIds}
                  onChange={setSelectedCollectionIds}
                  disabled={isLoading}
                />
              ) : (
                <p className="text-desc text-sm">No collections yet. You can add this to one later.</p>
              )}
            </div>
          </aside>
        </form>

        {/* Footer */}
        <footer className="flex shrink-0 items-center gap-3 border-t border-border bg-surface/60 px-5 py-3">
          <p className="hidden items-center gap-3 font-mono text-[11px] text-muted-foreground sm:flex">
            <span className="flex items-center gap-1">
              <Kbd keys={["⌘", "↵"]} /> create
            </span>
            <span className="flex items-center gap-1">
              <Kbd keys={["esc"]} /> cancel
            </span>
          </p>
          <div className="ml-auto flex items-center gap-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button type="submit" form="new-item-form" disabled={!canSubmit}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {isLoading ? "Saving…" : `Create ${typeName}`}
            </Button>
          </div>
        </footer>
      </DialogContent>
    </Dialog>
  );
}

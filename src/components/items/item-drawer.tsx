"use client";

import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Star,
  Pin,
  Copy,
  Pencil,
  Trash2,
  FolderOpen,
  X,
  Save,
  Command,
  Download,
  Check,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { formatLongDate, formatRelativeDate } from "@/lib/utils/date";
import { getItemTypeIcon } from "@/lib/constants/item-types";
import { useItemDrawer } from "./item-drawer-provider";
import { useClipboard } from "@/hooks/use-clipboard";
import { toast } from "sonner";
import { updateItem, deleteItem, toggleItemFavorite, toggleItemPin } from "@/actions/items";
import { getUserCollections } from "@/actions/collections";
import DeleteItemDialog from "./delete-item-dialog";
import CodeEditor from "./code-editor";
import MarkdownEditor from "./markdown-editor";
import ImageViewer from "./image-viewer";
import FileViewer from "./file-viewer";
import CollectionPicker, { type CollectionOption } from "./collection-picker";
import SuggestTagsButton from "./suggest-tags-button";
import GenerateDescriptionButton from "./generate-description-button";
import { Kbd } from "@/components/shared/kbd";
import LanguagePicker from "./language-picker";
import { detectLanguage } from "@/lib/detect-language";
import { fileDownloadPath, fileViewPath } from "@/lib/file-url";
import { readableColor } from "@/lib/utils/color";
import { isTyping } from "@/hooks/use-hotkey";
import { cn } from "@/lib/utils";
import { MAX_DESCRIPTION_LENGTH } from "@/lib/validation";
import { DescriptionCount } from "./description-count";

function DrawerSkeleton() {
  return (
    <div className="space-y-6 p-6 sm:p-8">
      {/* Header skeleton */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20" />
          </div>
        </div>
      </div>
      {/* Action bar skeleton */}
      <Skeleton className="h-9 w-full" />
      <Separator />
      {/* Content skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-full" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-40 w-full" />
      </div>
    </div>
  );
}

/**
 * An edit field's label in the same `// label` voice as the section labels,
 * still tied to its field (`htmlFor`) for screen readers and clicks.
 */
function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <Label htmlFor={htmlFor} className="gap-0 font-mono text-[11px] font-normal text-muted-foreground">
      <span className="mr-[1ch] text-faint dark:text-muted-foreground/50">{"//"}</span>
      {children}
    </Label>
  );
}

/** `// description`: the drawer's section labels, in the app's code-comment voice. */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 font-mono text-[11px] text-muted-foreground">
      <span className="text-faint dark:text-muted-foreground/50">{"// "}</span>
      {children}
    </p>
  );
}

/**
 * The description, clamped to four lines so a long one can't push the content
 * out of view; "Show more" opens it in full. Unbroken strings (URLs, hashes)
 * wrap anywhere instead of running past the column.
 */
function Description({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const { copied, copy } = useClipboard();
  const [open, setOpen] = useState(false);
  const [clamped, setClamped] = useState(false);

  // Whether the clamp cuts anything off; measured while clamped, and again on resize
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || open) return;
    const measure = () => setClamped(el.scrollHeight > el.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text, open]);

  return (
    <div>
      {/* The section label, with a copy button for the description */}
      <div className="mb-2 flex items-center gap-2">
        <p className="font-mono text-[11px] text-muted-foreground">
          <span className="text-faint dark:text-muted-foreground/50">{"// "}</span>
          description
        </p>
        <button
          type="button"
          onClick={() => copy(text)}
          className={cn(
            "flex items-center gap-1 rounded px-1 font-mono text-[11px] transition-colors",
            copied ? "text-lime" : "text-faint dark:text-muted-foreground/60 hover:text-(--grid-color)"
          )}
          aria-label="Copy description"
          title="Copy description"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? "copied" : "copy"}
        </button>
      </div>
      <p
        ref={ref}
        className={cn(
          "text-desc text-[15px] leading-relaxed whitespace-pre-line [overflow-wrap:anywhere]",
          !open && "line-clamp-4"
        )}
      >
        {text}
      </p>
      {(clamped || open) && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="mt-1.5 font-mono text-xs text-(--grid-color) underline-offset-4 hover:underline"
        >
          {open ? "show less" : "show more"}
        </button>
      )}
    </div>
  );
}

/**
 * A button in the item's action bar. It takes its colour (`color`) on hover,
 * while pressed, and for as long as it's on (`active`: favorited, pinned, just
 * copied), with a tinted fill and border.
 */
function ToolButton({
  color,
  active = false,
  className,
  style,
  ...props
}: React.ComponentProps<"button"> & { color: string; active?: boolean }) {
  return (
    <button
      type="button"
      data-anim-icons
      aria-pressed={active}
      className={cn(
        "group/tool flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 font-mono text-xs outline-none",
        "transition-[color,background-color,border-color,scale] duration-150 active:scale-95",
        "focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--tool)_45%,transparent)]",
        "hover:border-[color-mix(in_srgb,var(--tool)_30%,transparent)] hover:bg-[color-mix(in_srgb,var(--tool)_12%,transparent)] hover:text-(--tool)",
        "active:bg-[color-mix(in_srgb,var(--tool)_20%,transparent)]",
        active
          ? "border-[color-mix(in_srgb,var(--tool)_32%,transparent)] bg-[color-mix(in_srgb,var(--tool)_14%,transparent)] text-(--tool)"
          : "border-transparent text-muted-foreground",
        className
      )}
      style={{ "--tool": color, ...style } as React.CSSProperties}
      {...props}
    />
  );
}

// Types that have content field
const TEXT_TYPES = ["snippet", "prompt", "command", "note"];
// Types that have language field
const LANGUAGE_TYPES = ["snippet", "command"];
// Types that support AI prompt optimization
const OPTIMIZE_TYPES = ["prompt"];
// Types that have file uploads
const FILE_TYPES = ["file", "image"];

export default function ItemDrawer() {
  const router = useRouter();
  const { isOpen, item, isLoading, isPro, closeDrawer, setItem } = useItemDrawer();

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  // Centered panel, or the whole window (M). Kept between items.
  const [expanded, setExpanded] = useState(false);
  // Explain needs room for a second window: go full screen first (M shrinks
  // back, where code and explanation become tabs)
  const onExplanationToggle = (open: boolean) => {
    if (open) setExpanded(true);
  };

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [language, setLanguage] = useState("");
  // A paste re-detects the language from the whole content until the user picks one
  const [languageSource, setLanguageSource] = useState<"none" | "auto" | "user">("none");
  const [tags, setTags] = useState("");
  const [collections, setCollections] = useState<CollectionOption[]>([]);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>([]);

  // Reset form when item changes or edit mode is entered
  useEffect(() => {
    if (item) {
      setTitle(item.title);
      setDescription(item.description || "");
      setContent(item.content || "");
      setUrl(item.url || "");
      setLanguage(item.language || "");
      setLanguageSource("none");
      setTags(item.tags.join(", "));
      setSelectedCollectionIds(item.collections.map((c) => c.id));
    }
  }, [item]);

  // Reset edit mode and delete dialog when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setIsEditing(false);
      setShowDeleteDialog(false);
    }
  }, [isOpen]);

  const handleToggleFavorite = async () => {
    if (!item) return;

    const result = await toggleItemFavorite(item.id);

    if (result.success && result.data) {
      setItem({ ...item, isFavorite: result.data.isFavorite });
      toast.success(result.data.isFavorite ? "Added to favorites" : "Removed from favorites");
      router.refresh();
    } else {
      toast.error(result.error || "Failed to update favorite");
    }
  };

  const handleTogglePin = async () => {
    if (!item) return;

    const result = await toggleItemPin(item.id);

    if (result.success && result.data) {
      setItem({ ...item, isPinned: result.data.isPinned });
      toast.success(result.data.isPinned ? "Item pinned" : "Item unpinned");
      router.refresh();
    } else {
      toast.error(result.error || "Failed to update pin");
    }
  };

  const handleEdit = async () => {
    // Fetch collections for the picker
    const result = await getUserCollections();
    if (result.success && result.data) {
      setCollections(result.data);
    }
    setIsEditing(true);
  };

  const handleCancel = () => {
    // Reset form to original values
    if (item) {
      setTitle(item.title);
      setDescription(item.description || "");
      setContent(item.content || "");
      setUrl(item.url || "");
      setLanguage(item.language || "");
      setLanguageSource("none");
      setTags(item.tags.join(", "));
      setSelectedCollectionIds(item.collections.map((c) => c.id));
    }
    setIsEditing(false);
  };

  const pickLanguage = (value: string) => {
    setLanguage(value);
    setLanguageSource("user");
  };

  const detectPastedLanguage = (value: string) => {
    if (!item || languageSource === "user") return;
    const detected = detectLanguage(value, item.itemType.name);
    if (detected) {
      setLanguage(detected);
      setLanguageSource("auto");
    }
  };

  const handleSave = async () => {
    if (!item) return;

    setIsSaving(true);
    try {
      const tagsArray = tags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const result = await updateItem(item.id, {
        title,
        description: description || null,
        content: content || null,
        url: url || null,
        language: language || null,
        tags: tagsArray,
        collectionIds: selectedCollectionIds,
      });

      if (result.success && result.data) {
        setItem(result.data);
        setIsEditing(false);
        toast.success("Item updated");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to update item");
      }
    } catch {
      toast.error("Failed to update item");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!item) return;

    const result = await deleteItem(item.id);

    if (result.success) {
      toast.success("Item deleted");
      closeDrawer();
      router.refresh();
    } else {
      toast.error(result.error || "Failed to delete item");
    }
  };

  const handleAcceptOptimized = async (optimizedContent: string) => {
    if (!item) return false;

    const result = await updateItem(item.id, {
      title: item.title,
      description: item.description || null,
      content: optimizedContent,
      url: item.url || null,
      language: item.language || null,
      tags: item.tags,
      collectionIds: item.collections.map((c) => c.id),
    });

    if (result.success && result.data) {
      setItem(result.data);
      toast.success("Prompt updated with optimized version");
      router.refresh();
      return true;
    }
    toast.error(result.error || "Failed to save optimized prompt");
    return false;
  };

  const IconComponent = item ? getItemTypeIcon(item.itemType.icon) : null;
  const iconColor = item ? readableColor(item.itemType.color) : undefined;
  const typeName = item?.itemType.name || "";
  const showContent = TEXT_TYPES.includes(typeName);
  const showLanguage = LANGUAGE_TYPES.includes(typeName);
  const showOptimize = OPTIMIZE_TYPES.includes(typeName);
  const showUrl = typeName === "link";
  const showFileContent = FILE_TYPES.includes(typeName);
  const isImage = typeName === "image";
  const canSave = title.trim().length > 0;

  // Keys while the item is open: E edit, F favorite, P pin, M full screen,
  // ⌫ delete;
  // while editing, ⌘S / Ctrl+S saves. Re-bound each render so the handlers are current.
  useEffect(() => {
    if (!isOpen || !item) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || event.altKey) return;
      if (isEditing) {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
          event.preventDefault();
          if (canSave && !isSaving) handleSave();
        }
        return;
      }
      if (event.metaKey || event.ctrlKey || showDeleteDialog || isTyping(event.target)) return;
      if (document.querySelector('[role="alertdialog"], [role="menu"], [role="listbox"]')) return;
      const actions: Record<string, () => void> = {
        e: handleEdit,
        f: handleToggleFavorite,
        p: handleTogglePin,
        delete: () => setShowDeleteDialog(true),
        backspace: () => setShowDeleteDialog(true),
        m: () => setExpanded((v) => !v),
      };
      const action = actions[event.key.toLowerCase()];
      if (!action) return;
      event.preventDefault();
      action();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const handleDownload = () => {
    // The bucket is private: files are only readable through the download route
    const path = fileDownloadPath(item?.fileUrl);
    if (path) window.open(path, "_blank");
  };

  const details = item ? (
    <div>
      <SectionLabel>details</SectionLabel>
      <dl className="space-y-2 rounded-lg border border-border bg-card/60 px-3 py-2.5 font-mono text-xs">
        <div>
          <dt className="text-muted-foreground">created</dt>
          <dd className="mt-0.5 text-foreground">{formatLongDate(item.createdAt)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">updated</dt>
          <dd className="mt-0.5 text-foreground">{formatLongDate(item.updatedAt)}</dd>
        </div>
      </dl>
    </div>
  ) : null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeDrawer()}>
      {/* A centered panel over the page, or the whole window when expanded (M).
          On phones it always fills the screen. Content on the left; tags,
          collections and dates in a narrow column on the right. */}
      <DialogContent
        showCloseButton={false}
        className={cn(
          "flex max-w-none flex-col gap-0 overflow-hidden border-border bg-background p-0 shadow-[0_40px_120px_-30px_rgb(0_0_0/0.6)]",
          "transition-[width,height,border-radius] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] sm:max-w-none",
          "max-sm:h-dvh max-sm:w-screen max-sm:rounded-none max-sm:border-0",
          expanded
            ? "sm:h-[calc(100dvh-1.5rem)] sm:w-[calc(100vw-1.5rem)] sm:rounded-xl"
            : "sm:h-[min(88dvh,880px)] sm:w-[min(calc(100vw-3rem),960px)] sm:rounded-2xl"
        )}
        style={
          // The app's lime for the panel's accents; only the type icon and label wear the type's colour
          item ? ({ "--grid-color": "var(--brand-lime)", "--ring": "var(--brand-lime)" } as React.CSSProperties) : undefined
        }
      >
        {/* Window controls: full screen and close */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="panel-close max-sm:hidden"
            aria-label={expanded ? "Exit full screen" : "Full screen"}
            title={expanded ? "Exit full screen  M" : "Full screen  M"}
          >
            {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          <DialogClose className="panel-close" aria-label="Close" title="Close  Esc">
            <X className="h-4 w-4" />
          </DialogClose>
        </div>

        {isLoading || !item ? (
          <>
            <DialogTitle className="sr-only">Loading item</DialogTitle>
            <DialogDescription className="sr-only">Loading item details</DialogDescription>
            <DrawerSkeleton />
          </>
        ) : (
          <>
            {/* Header */}
            <div className="relative shrink-0 px-6 pt-5 sm:px-8">
              {/* Lime along the top edge, and a soft wash behind the title */}
              <span
                aria-hidden
                className="absolute inset-x-0 top-0 h-[2px]"
                style={{ background: "linear-gradient(90deg, var(--brand-lime), transparent 75%)" }}
              />
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-32"
                style={{ background: "radial-gradient(80% 100% at 0% 0%, color-mix(in srgb, var(--brand-lime) 8%, transparent), transparent 70%)" }}
              />
              <p className="relative mb-4 pr-20 font-mono text-[11px] text-muted-foreground">
                <span className="text-lime">~/</span>items/{item.itemType.name}s
              </p>
              <div data-anim-icons className="relative flex items-center gap-3.5 pr-16">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${iconColor} 12%, transparent)`,
                    borderColor: `color-mix(in srgb, ${iconColor} 30%, transparent)`,
                  }}
                >
                  {IconComponent && <IconComponent className="h-5 w-5" style={{ color: iconColor }} />}
                </div>
                <div className="min-w-0 flex-1">
                  {isEditing ? (
                    <>
                      <DialogTitle className="sr-only">Editing {item.title}</DialogTitle>
                      <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Title"
                        aria-label="Title"
                        className="text-lg font-semibold"
                      />
                    </>
                  ) : (
                    <DialogTitle className="truncate font-display text-xl font-bold tracking-[-0.03em] sm:text-2xl">
                      {item.title}
                    </DialogTitle>
                  )}
                  <div className="mt-1 flex items-center gap-2 font-mono text-[11px]">
                    <span style={{ color: iconColor }}>{item.itemType.name}</span>
                    {!isEditing && item.language && (
                      <>
                        <span className="text-faint dark:text-muted-foreground/40">·</span>
                        <span className="text-muted-foreground">{item.language}</span>
                      </>
                    )}
                    <span className="text-faint dark:text-muted-foreground/40">·</span>
                    <span className="text-muted-foreground">updated {formatRelativeDate(item.updatedAt)}</span>
                  </div>
                </div>
              </div>
              <DialogDescription className="sr-only">
                {isEditing ? `Editing ${item.title}` : `Details for ${item.title}`}
              </DialogDescription>
            </div>

            {/* Action Bar */}
            {isEditing ? (
              <div className="flex items-center gap-2 px-6 py-3 sm:px-8">
                <Button
                  onClick={handleSave}
                  disabled={!canSave || isSaving}
                  size="sm"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? "Saving…" : "Save"}
                  <span aria-hidden className="btn-kbd">
                    <Command className="size-2.5" strokeWidth={2.5} />S
                  </span>
                </Button>
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  size="sm"
                  disabled={isSaving}
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-1 px-5 py-3 sm:px-7">
                <ToolButton color="light-dark(#d97706, #eab308)" active={item.isFavorite} onClick={handleToggleFavorite}>
                  <Star className="h-4 w-4" fill={item.isFavorite ? "currentColor" : "none"} />
                  {item.isFavorite ? "favorited" : "favorite"}
                  <Kbd keys={["F"]} className="ml-0.5 opacity-60 transition-opacity group-hover/tool:opacity-100" />
                </ToolButton>
                <ToolButton color="var(--destructive)" active={item.isPinned} onClick={handleTogglePin}>
                  <Pin className="h-4 w-4" fill={item.isPinned ? "currentColor" : "none"} />
                  {item.isPinned ? "pinned" : "pin"}
                  <Kbd keys={["P"]} className="ml-0.5 opacity-60 transition-opacity group-hover/tool:opacity-100" />
                </ToolButton>
                {showFileContent && item.fileUrl && (
                  <ToolButton color="var(--brand-cyan)" onClick={handleDownload}>
                    <Download className="h-4 w-4" />
                    download
                  </ToolButton>
                )}
                <ToolButton color="var(--brand-lime)" onClick={handleEdit}>
                  <Pencil className="h-4 w-4" />
                  edit
                  <Kbd keys={["E"]} className="ml-0.5 opacity-60 transition-opacity group-hover/tool:opacity-100" />
                </ToolButton>
                <div className="flex-1" />
                <ToolButton
                  color="var(--destructive)"
                  onClick={() => setShowDeleteDialog(true)}
                  aria-label="Delete item"
                  title="Delete  ⌫"
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </ToolButton>
              </div>
            )}

            <Separator />

            {/* Body: content on the left, metadata on the right */}
            {/* The grid is at least as tall as the body, so the content section can
                stretch to the bottom (its editor scrolls inside) whatever its length */}
            <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto">
              <div className="grid min-h-full grid-rows-[1fr_auto] gap-8 p-6 sm:p-8 md:grid-cols-[minmax(0,1fr)_220px] md:grid-rows-1">
                {isEditing ? (
                  <>
                    <div className="flex min-h-0 min-w-0 flex-col">
                  {/* Edit Form: the content field takes whatever height is left */}
                  <div className="flex min-h-0 flex-1 flex-col gap-4">
                    {/* Description */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <FieldLabel htmlFor="description">description</FieldLabel>
                        {isPro && (
                          <GenerateDescriptionButton
                            title={title}
                            content={content || null}
                            url={url || null}
                            language={language || null}
                            typeName={typeName}
                            onGenerated={setDescription}
                          />
                        )}
                      </div>
                      <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Optional description..."
                        rows={3}
                        maxLength={MAX_DESCRIPTION_LENGTH}
                      />
                      <DescriptionCount length={description.length} />
                    </div>

                    {/* Language (snippet/command) */}
                    {showLanguage && (
                      <div className="space-y-2">
                        <FieldLabel htmlFor="language">language</FieldLabel>
                        <div>
                          <LanguagePicker
                            value={language}
                            onChange={pickLanguage}
                            detected={languageSource === "auto"}
                            disabled={isSaving}
                          />
                        </div>
                      </div>
                    )}

                    {/* Content (text types) */}
                    {showContent && (
                      <div className="flex min-h-[440px] flex-1 flex-col gap-2">
                        <FieldLabel htmlFor="content">content</FieldLabel>
                        <div className="min-h-0 flex-1">
                        {showLanguage ? (
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
                            placeholder="Write your content in Markdown..."
                            fill
                          />
                        )}
                        </div>
                      </div>
                    )}

                    {/* URL (link types) */}
                    {showUrl && (
                      <div className="space-y-2">
                        <FieldLabel htmlFor="url">url</FieldLabel>
                        <Input
                          id="url"
                          type="url"
                          value={url}
                          onChange={(e) => setUrl(e.target.value)}
                          placeholder="https://..."
                        />
                      </div>
                    )}

                  </div>

                    </div>
                    <aside className="space-y-6 md:sticky md:top-8 md:self-start">
                    {/* Tags */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <FieldLabel htmlFor="tags">tags</FieldLabel>
                        {isPro && (
                          <SuggestTagsButton
                            title={title}
                            content={content || null}
                            language={language || null}
                            typeName={typeName}
                            existingTags={tags.split(",").map((t) => t.trim()).filter((t) => t.length > 0)}
                            onAcceptTag={(tag) => {
                              setTags((prev) => {
                                const trimmed = prev.trim();
                                if (!trimmed) return tag;
                                return trimmed.endsWith(",") ? `${trimmed} ${tag}` : `${trimmed}, ${tag}`;
                              });
                            }}
                            disabled={isSaving}
                          />
                        )}
                      </div>
                      <Input
                        id="tags"
                        value={tags}
                        onChange={(e) => setTags(e.target.value)}
                        placeholder="Comma-separated tags..."
                      />
                      <p className="text-xs text-muted-foreground">
                        Separate tags with commas
                      </p>
                    </div>

                  {/* Collections (editable) */}
                  {collections.length > 0 && (
                    <div className="space-y-2">
                      <FieldLabel>collections</FieldLabel>
                      <CollectionPicker
                        collections={collections}
                        selectedIds={selectedCollectionIds}
                        onChange={setSelectedCollectionIds}
                        disabled={isSaving}
                      />
                    </div>
                  )}

                      {details}
                    </aside>
                  </>
                ) : (
                  <>
                    <div className="flex min-h-0 min-w-0 flex-col gap-6">
                  {/* View Mode Content */}
                  {/* Description */}
                  {item.description && <Description key={item.id} text={item.description} />}

                  {/* Content (text types) */}
                  {item.content && (
                    <div className="flex min-h-[440px] flex-1 flex-col">
                      <SectionLabel>content</SectionLabel>
                      <div className="min-h-0 flex-1">
                      {showLanguage ? (
                        <CodeEditor
                          value={item.content}
                          language={item.language || "plaintext"}
                          fill
                          readOnly
                          showExplain
                          onExplanationToggle={onExplanationToggle}
                          isPro={isPro}
                          title={item.title}
                          typeName={typeName}
                        />
                      ) : (
                        <MarkdownEditor
                          value={item.content}
                          readOnly
                          fill
                          showOptimize={showOptimize}
                          isPro={isPro}
                          title={item.title}
                          onAcceptOptimized={handleAcceptOptimized}
                        />
                      )}
                      </div>
                    </div>
                  )}

                  {/* URL (link types) */}
                  {item.url && (
                    <div>
                      <SectionLabel>url</SectionLabel>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="break-all font-mono text-sm text-tok-path underline-offset-4 hover:underline"
                      >
                        {item.url}
                      </a>
                    </div>
                  )}

                  {/* File/Image content */}
                  {showFileContent && item.fileUrl && (
                    // A preview fills the height left, like the content editor does
                    <div className="flex min-h-[440px] flex-1 flex-col">
                      <SectionLabel>{isImage ? "image" : "file"}</SectionLabel>
                      {isImage ? (
                        <div className="min-h-0 flex-1">
                          <ImageViewer
                            src={fileViewPath(item.fileUrl) ?? ""}
                            alt={item.fileName || item.title}
                            fileName={item.fileName}
                            fileSize={item.fileSize}
                          />
                        </div>
                      ) : (
                        <div className="min-h-0 flex-1">
                          <FileViewer
                            fileUrl={item.fileUrl}
                            fileName={item.fileName}
                            fileSize={item.fileSize}
                            onDownload={handleDownload}
                          />
                        </div>
                      )}
                    </div>
                  )}

                    </div>
                    <aside className="space-y-6 md:sticky md:top-8 md:self-start">
                  {/* Tags: always shown; without any, a shortcut into editing them */}
                  <div>
                    <SectionLabel>tags</SectionLabel>
                    {item.tags.length === 0 ? (
                      <button
                        type="button"
                        onClick={handleEdit}
                        className="rounded-md border border-dashed border-border px-2 py-1 font-mono text-xs text-muted-foreground transition-colors hover:border-(--grid-color) hover:text-(--grid-color)"
                      >
                        + add tags
                      </button>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {item.tags.map((tag) => (
                          <span
                            key={tag}
                            className="max-w-full rounded-md border border-border bg-card px-2 py-0.5 font-mono text-xs text-muted-foreground [overflow-wrap:anywhere]"
                          >
                            <span className="text-faint dark:text-muted-foreground/50">#</span>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Collections */}
                  {item.collections.length > 0 && (
                    <div>
                      <SectionLabel>collections</SectionLabel>
                      <div className="flex flex-wrap gap-1.5">
                        {item.collections.map((collection) => (
                          <span
                            key={collection.id}
                            className="inline-flex items-center gap-1.5 rounded-md border border-cyan/25 bg-cyan/[0.06] px-2 py-0.5 text-xs text-foreground/90"
                          >
                            <FolderOpen className="h-3 w-3 text-cyan" />
                            {collection.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                      {details}
                    </aside>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>

      {item && (
        <DeleteItemDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          itemTitle={item.title}
          onConfirm={handleDelete}
        />
      )}
    </Dialog>
  );
}

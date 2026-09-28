"use client";

import { Download, Star, Pin, File, FileText, FileImage, FileVideo, FileAudio, FileArchive, FileCode, FileSpreadsheet } from 'lucide-react';
import { createElement } from 'react';
import { useItemDrawer } from '@/components/items/item-drawer-provider';
import { formatRelativeDate } from '@/lib/utils/date';
import { formatFileSize } from '@/lib/r2';
import { readableColor } from "@/lib/utils/color";
import type { ItemWithType } from '@/lib/db/items';
import { itemDragProps } from './item-drag';

interface FileListRowProps {
  item: ItemWithType;
}

/**
 * Get icon component based on file extension
 */
function getFileIcon(fileName: string | null) {
  if (!fileName) return File;

  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  // Document types
  if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'].includes(ext)) {
    return FileText;
  }

  // Image types
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)) {
    return FileImage;
  }

  // Video types
  if (['mp4', 'mov', 'avi', 'mkv', 'webm', 'wmv'].includes(ext)) {
    return FileVideo;
  }

  // Audio types
  if (['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'].includes(ext)) {
    return FileAudio;
  }

  // Archive types
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext)) {
    return FileArchive;
  }

  // Code types
  if (['js', 'ts', 'jsx', 'tsx', 'py', 'rb', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'css', 'scss', 'html', 'json', 'xml', 'yaml', 'yml', 'md', 'sh', 'sql'].includes(ext)) {
    return FileCode;
  }

  // Spreadsheet types
  if (['xls', 'xlsx', 'csv', 'ods'].includes(ext)) {
    return FileSpreadsheet;
  }

  return File;
}

export default function FileListRow({ item }: FileListRowProps) {
  const { openDrawer } = useItemDrawer();
  const iconColor = readableColor(item.itemType.color);

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!item.fileUrl) return;

    // Extract the path from the R2 URL (format: https://xxx.r2.dev/{userId}/{timestamp}-{filename})
    try {
      const url = new URL(item.fileUrl);
      // Remove leading slash from pathname
      const filePath = url.pathname.slice(1);
      // Use download proxy to avoid CORS
      window.open(`/api/download/${filePath}`, '_blank');
    } catch {
      // Fallback: open the file URL directly
      window.open(item.fileUrl, '_blank');
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      {...itemDragProps(item.id, item.title, item.itemType.name, iconColor)}
      aria-label={`Open ${item.title}`}
      className="icon-anim-off group relative flex cursor-pointer items-center gap-4 px-4 py-3 outline-none transition-colors hover:bg-lime/[0.05] focus-visible:bg-lime/[0.07]"
      onClick={() => openDrawer(item.id)}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openDrawer(item.id);
        }
      }}
    >
      <span
        aria-hidden
        className="absolute inset-y-2 left-0 w-[2px] scale-y-0 rounded-r-full bg-lime transition-transform duration-300 group-hover:scale-y-100 group-focus-visible:scale-y-100"
      />
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md"
        style={{ backgroundColor: `color-mix(in srgb, ${iconColor} 14%, transparent)` }}
      >
        {createElement(getFileIcon(item.fileName), { className: "h-4 w-4", style: { color: iconColor } })}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">{item.title}</span>
          {item.isPinned && <Pin className="h-3 w-3 shrink-0 text-destructive" aria-label="Pinned" />}
          {item.isFavorite && <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-500 dark:text-amber-400" aria-label="Favorite" />}
        </div>
        <p className="truncate font-mono text-[11px] text-muted-foreground">
          {item.fileName ?? 'unnamed'}
          <span className="sm:hidden">
            {item.fileSize ? ` · ${formatFileSize(item.fileSize)}` : ''} · {formatRelativeDate(item.createdAt)}
          </span>
        </p>
      </div>

      <span className="hidden w-20 shrink-0 text-right font-mono text-xs tabular-nums text-muted-foreground sm:block">
        {item.fileSize ? formatFileSize(item.fileSize) : '—'}
      </span>
      <span className="hidden w-24 shrink-0 text-right font-mono text-[11px] text-muted-foreground sm:block">
        {formatRelativeDate(item.createdAt)}
      </span>

      {item.fileUrl && (
        <button
          type="button"
          onClick={handleDownload}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-transparent text-muted-foreground transition-colors hover:border-border hover:bg-muted hover:text-lime"
          aria-label="Download file"
          title="Download file"
        >
          <Download className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

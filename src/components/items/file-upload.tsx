"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import { fileViewPath } from "@/lib/file-url";
import { Upload, X, File, Image as ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FILE_CONSTRAINTS, formatFileSize } from "@/lib/r2";
import { needsParts, send, sendInParts } from "@/components/shared/upload-in-parts";
import { cn } from "@/lib/utils";

/**
 * Upload a file for a new item. A file that fits in one request is posted as it is; a larger one
 * (the host refuses bodies over about 4.5 MB) goes up in parts first, which the server then joins
 * and checks (lib/upload-parts.ts).
 */
async function uploadInParts(file: File, itemType: "file" | "image", onProgress: (percent: number) => void) {
  const form = new FormData();
  form.append("itemType", itemType);

  if (!needsParts(file)) {
    form.append("file", file);
    const reply = await send("POST", "/api/upload", form, (f) => onProgress(Math.round(f * 100)));
    return reply.data as UploadedFile;
  }

  // The parts are most of the work; joining and checking them is the last few percent
  const { uploadId, partCount } = await sendInParts(file, (f) => onProgress(Math.round(f * 95)));
  form.append("uploadId", uploadId);
  form.append("partCount", String(partCount));
  form.append("fileName", file.name);
  form.append("mimeType", file.type);
  const reply = await send("POST", "/api/upload", form, () => onProgress(97));
  return reply.data as UploadedFile;
}

interface FileUploadProps {
  itemType: "file" | "image";
  onUploadComplete: (data: {
    fileUrl: string;
    fileName: string;
    fileSize: number;
  }) => void;
  onUploadError: (error: string) => void;
  disabled?: boolean;
}

interface UploadedFile {
  fileUrl: string;
  fileName: string;
  fileSize: number;
}

export default function FileUpload({
  itemType,
  onUploadComplete,
  onUploadError,
  disabled = false,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const constraints = FILE_CONSTRAINTS[itemType];
  const acceptedExtensions = constraints.extensions.join(",");
  const maxSizeMB = constraints.maxSize / (1024 * 1024);

  const validateFile = useCallback(
    (file: File): string | null => {
      // Check size
      if (file.size > constraints.maxSize) {
        return `File size exceeds ${maxSizeMB} MB limit`;
      }

      // Check extension
      const ext = "." + file.name.split(".").pop()?.toLowerCase();
      if (!(constraints.extensions as readonly string[]).includes(ext)) {
        return `Invalid file type. Allowed: ${constraints.extensions.join(", ")}`;
      }

      return null;
    },
    [constraints, maxSizeMB]
  );

  const uploadFile = useCallback(
    async (file: File) => {
      const error = validateFile(file);
      if (error) {
        onUploadError(error);
        return;
      }

      setIsUploading(true);
      setUploadProgress(0);

      try {
        const data = await uploadInParts(file, itemType, setUploadProgress);
        setUploadedFile(data);
        onUploadComplete(data);
      } catch (err) {
        onUploadError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    },
    [itemType, validateFile, onUploadComplete, onUploadError]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled || isUploading) return;

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        uploadFile(files[0]);
      }
    },
    [disabled, isUploading, uploadFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        uploadFile(files[0]);
      }
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [uploadFile]
  );

  const handleRemoveFile = useCallback(() => {
    setUploadedFile(null);
  }, []);

  const handleClick = useCallback(() => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  }, [disabled, isUploading]);

  // Show uploaded file preview
  if (uploadedFile) {
    const isImage = itemType === "image";

    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-start gap-3">
          {isImage ? (
            <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-muted">
              <Image
                src={fileViewPath(uploadedFile.fileUrl) ?? ""}
                alt={uploadedFile.fileName}
                unoptimized
                fill
                sizes="64px"
                className="object-cover"
              />
            </div>
          ) : (
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-md bg-muted">
              <File className="h-8 w-8 text-muted-foreground" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-sm">
              {uploadedFile.fileName}
            </p>
            <p className="text-muted-foreground text-xs">
              {formatFileSize(uploadedFile.fileSize)}
            </p>
          </div>

          <Button
      type="button"
      variant="outline"
      size="icon"
      className="term-bare term-danger h-8 w-8 flex-shrink-0"
      onClick={handleRemoveFile}
      aria-label="Remove file"
      disabled={disabled}
     >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Show upload area
  return (
    <div
      className={cn(
        "relative cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors",
        isDragging
          ? "border-primary bg-primary/5"
          : "border-border hover:border-muted-foreground/50",
        (disabled || isUploading) && "cursor-not-allowed opacity-50"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedExtensions}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isUploading}
      />

      <div className="flex flex-col items-center gap-3">
        {isUploading ? (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div className="space-y-1">
              <p className="font-medium text-sm">Uploading...</p>
              <p className="text-muted-foreground text-xs">{uploadProgress}%</p>
            </div>
            <div className="h-2 w-32 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </>
        ) : (
          <>
            <div className="rounded-full bg-muted p-3">
              {itemType === "image" ? (
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              ) : (
                <Upload className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div className="space-y-1">
              <p className="font-medium text-sm">
                Drop {itemType === "image" ? "an image" : "a file"} here or
                click to upload
              </p>
              <p className="text-muted-foreground text-xs">
                Max {maxSizeMB} MB
                {itemType === "image"
                  ? " (PNG, JPG, GIF, WebP, SVG)"
                  : " (PDF, TXT, MD, JSON, YAML, XML, CSV)"}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

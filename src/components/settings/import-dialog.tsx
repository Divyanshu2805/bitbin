'use client';

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, FileJson, FileArchive, Loader2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { previewImport, importData } from '@/actions/import';
import type { ImportPreview, ImportResult } from '@/lib/import-schema';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPro: boolean;
}

type ZipPreview = ImportPreview & { fileCount: number };

/** POST a ZIP to the import route; the answer is the route's JSON, or an error message. */
async function sendZip<T>(file: File, mode: 'preview' | 'import', skipDuplicates = true) {
  const form = new FormData();
  form.set('file', file);
  form.set('mode', mode);
  form.set('skipDuplicates', String(skipDuplicates));

  const res = await fetch('/api/import', { method: 'POST', body: form });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false as const, error: (body.error as string) || 'Import failed' };
  return { ok: true as const, data: body.data as T, warning: (body.warning as string | null) ?? null };
}

export default function ImportDialog({ open, onOpenChange, isPro }: ImportDialogProps) {
  const router = useRouter();
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<ZipPreview | ImportPreview | null>(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  function reset() {
    setFileContent(null);
    setZipFile(null);
    setFileName(null);
    setPreview(null);
    setSkipDuplicates(true);
    setLoading(false);
    setImporting(false);
  }

  function handleClose(isOpen: boolean) {
    if (!isOpen) reset();
    onOpenChange(isOpen);
  }

  const handleFile = useCallback(async (file: File) => {
    const lower = file.name.toLowerCase();
    const isZip = lower.endsWith('.zip');

    if (!isZip && !lower.endsWith('.json')) {
      toast.error('Please select a .json or .zip file');
      return;
    }
    if (isZip && !isPro) {
      toast.error('ZIP import requires a Pro subscription. Import the JSON file instead.');
      return;
    }

    setLoading(true);
    try {
      if (isZip) {
        const result = await sendZip<ZipPreview>(file, 'preview');
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        setZipFile(file);
        setFileContent(null);
        setFileName(file.name);
        setPreview(result.data);
        return;
      }

      const text = await file.text();
      const result = await previewImport(text);
      if (!result.success) {
        toast.error(result.error || 'Invalid file');
        return;
      }
      setFileContent(text);
      setZipFile(null);
      setFileName(file.name);
      setPreview(result.data!);
    } catch {
      toast.error('Failed to read file');
    } finally {
      setLoading(false);
    }
  }, [isPro]);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Allow choosing the same file again after a reset
    e.target.value = '';
  }

  async function handleImport() {
    if (!fileContent && !zipFile) return;

    setImporting(true);
    try {
      let data: ImportResult;
      let warning: string | null = null;

      if (zipFile) {
        const result = await sendZip<ImportResult>(zipFile, 'import', skipDuplicates);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        data = result.data;
        warning = result.warning;
      } else {
        const result = await importData(fileContent!, skipDuplicates);
        if (!result.success) {
          toast.error(result.error || 'Import failed');
          return;
        }
        data = result.data!;
      }

      const { itemsImported, collectionsImported, itemsSkipped, collectionsSkipped } = data;

      let message = `Imported ${itemsImported} item${itemsImported !== 1 ? 's' : ''}`;
      if (collectionsImported > 0) {
        message += ` and ${collectionsImported} collection${collectionsImported !== 1 ? 's' : ''}`;
      }
      if (itemsSkipped > 0 || collectionsSkipped > 0) {
        const skippedParts: string[] = [];
        if (itemsSkipped > 0) skippedParts.push(`${itemsSkipped} item${itemsSkipped !== 1 ? 's' : ''}`);
        if (collectionsSkipped > 0) skippedParts.push(`${collectionsSkipped} collection${collectionsSkipped !== 1 ? 's' : ''}`);
        message += ` (skipped ${skippedParts.join(' and ')})`;
      }

      toast.success(message);
      if (warning) toast.warning(`A file could not be restored: ${warning}`);
      handleClose(false);
      router.refresh();
    } catch {
      toast.error('Import failed');
    } finally {
      setImporting(false);
    }
  }

  const TYPE_LABELS: Record<string, string> = {
    snippet: 'snippets',
    prompt: 'prompts',
    command: 'commands',
    note: 'notes',
    file: 'files',
    image: 'images',
    link: 'links',
  };

  const fileCount = preview && 'fileCount' in preview ? preview.fileCount : null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Data</DialogTitle>
          <DialogDescription>
            Import from a BitBin export: your whole bin, or a single collection. A ZIP (Pro) also
            restores files and images; collections that already exist get the imported items added to them.
          </DialogDescription>
        </DialogHeader>

        {!preview ? (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer"
            onClick={() => document.getElementById('import-file-input')?.click()}
          >
            {loading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Reading file...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Drop a .json{isPro ? ' or .zip' : ''} file here or click to browse
                </p>
              </div>
            )}
            <input
              id="import-file-input"
              type="file"
              accept={isPro ? '.json,.zip' : '.json'}
              className="hidden"
              onChange={handleFileInput}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {zipFile ? <FileArchive className="h-4 w-4" /> : <FileJson className="h-4 w-4" />}
              <span>{fileName}</span>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium">Preview</p>
              <div className="text-sm text-muted-foreground space-y-1">
                {Object.entries(preview.itemCountsByType).map(([type, count]) => (
                  <p key={type}>
                    {count} {TYPE_LABELS[type] || type}
                  </p>
                ))}
                {preview.collectionCount > 0 && (
                  <p>{preview.collectionCount} collection{preview.collectionCount !== 1 ? 's' : ''}</p>
                )}
                {preview.tagCount > 0 && (
                  <p>{preview.tagCount} unique tag{preview.tagCount !== 1 ? 's' : ''}</p>
                )}
                {fileCount !== null && (
                  <p>{fileCount} stored file{fileCount !== 1 ? 's' : ''} to restore</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="skip-duplicates"
                checked={skipDuplicates}
                onCheckedChange={(checked) => setSkipDuplicates(checked === true)}
              />
              <label
                htmlFor="skip-duplicates"
                className="text-sm text-muted-foreground cursor-pointer"
              >
                Skip duplicates (matches on title + type + content)
              </label>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => reset()}>
                <RotateCcw className="h-4 w-4" />
                Choose Different File
              </Button>
              <Button onClick={handleImport} disabled={importing}>
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Import
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

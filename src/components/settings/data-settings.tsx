'use client';

import { useState } from 'react';
import Panel, { ProTag } from '@/components/shared/panel';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Database, Download, Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { downloadFrom } from '@/components/shared/download-file';
import ImportDialog from './import-dialog';

interface DataSettingsProps {
  isPro: boolean;
}

export default function DataSettings({ isPro }: DataSettingsProps) {
  const [exportingJson, setExportingJson] = useState(false);
  const [exportingZip, setExportingZip] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  async function handleExport(format: 'json' | 'zip') {
    const setLoading = format === 'json' ? setExportingJson : setExportingZip;
    setLoading(true);

    try {
      const result = await downloadFrom(`/api/export?format=${format}`, `bitbin-export.${format}`);
      if (result.ok) toast.success(`Export downloaded as ${result.filename}`);
      else toast.error(result.error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Panel
        id="data"
        icon={<Database />}
        title="Data"
        description="Export your bin, or import from a previous export (a full export, or a single collection's)."
      >
        <div className="space-y-5">
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => handleExport('json')}
              disabled={exportingJson || exportingZip}
            >
              {exportingJson ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Export JSON
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => handleExport('zip')}
                disabled={exportingJson || exportingZip || !isPro}
              >
                {exportingZip ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Export ZIP
              </Button>
              {!isPro && (
                <ProTag />
              )}
            </div>
          </div>

          <Separator />

          <Button
            variant="outline"
            onClick={() => setImportOpen(true)}
          >
            <Upload className="mr-2 h-4 w-4" />
            Import from JSON or ZIP
          </Button>
        </div>
      </Panel>

      <ImportDialog open={importOpen} onOpenChange={setImportOpen} isPro={isPro} />
    </>
  );
}

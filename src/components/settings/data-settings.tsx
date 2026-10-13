'use client';

import { useState } from 'react';
import Panel, { ProTag } from '@/components/shared/panel';
import { Button } from '@/components/ui/button';
import { Database, Download, Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { downloadFrom } from '@/components/shared/download-file';
import ImportDialog from './import-dialog';
import { SettingRow, SettingRows } from './setting-row';

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
        description="Take your bin with you, or bring one back."
      >
        <SettingRows>
          <SettingRow
            title="Export"
            description="JSON holds your items and collections. ZIP adds your files and images."
          >
            <Button variant="outline" onClick={() => handleExport('json')} disabled={exportingJson || exportingZip}>
              {exportingJson ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Export JSON
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExport('zip')}
              disabled={exportingJson || exportingZip || !isPro}
            >
              {exportingZip ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Export ZIP
              {!isPro && <ProTag />}
            </Button>
          </SettingRow>

          <SettingRow title="Import" description="Bring back a full export, or a single collection's.">
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" />
              Import JSON or ZIP
            </Button>
          </SettingRow>
        </SettingRows>
      </Panel>

      <ImportDialog open={importOpen} onOpenChange={setImportOpen} isPro={isPro} />
    </>
  );
}

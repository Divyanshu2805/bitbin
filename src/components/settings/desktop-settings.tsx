import { Download, Monitor } from 'lucide-react';
import Panel, { ProTag } from '@/components/shared/panel';
import { Button } from '@/components/ui/button';
import ProLocked from './pro-locked';
import {
  DESKTOP_RELEASES_URL,
  DESKTOP_SOURCE_URL,
  DESKTOP_WINDOWS_DOWNLOAD_URL,
} from '@/lib/constants/desktop';

interface DesktopSettingsProps {
  isPro: boolean;
}

/** Settings → Desktop app: the tray app that saves the clipboard, a file or an image with a shortcut. */
export default function DesktopSettings({ isPro }: DesktopSettingsProps) {
  return (
    <Panel
      id="desktop"
      icon={<Monitor />}
      title="Desktop app"
      badge={!isPro ? <ProTag /> : undefined}
      description="Save the clipboard, a screenshot or a file from the system tray with one shortcut, without opening the browser."
    >
      {!isPro ? (
        <ProLocked>The desktop app is part of BitBin Pro.</ProLocked>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild variant="outline">
              <a href={DESKTOP_WINDOWS_DOWNLOAD_URL} rel="noopener noreferrer">
                <Download className="h-4 w-4" />
                Download for Windows
              </a>
            </Button>
            <a
              href={DESKTOP_SOURCE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground underline-offset-4 hover:text-lime hover:underline"
            >
              macOS and Linux: run from source
            </a>
          </div>

          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Run the installer. It installs for your account only and needs no admin rights.</li>
            <li>
              Create a token in <strong className="text-foreground">Browser extension</strong> above with the{' '}
              <strong className="text-foreground">Save items</strong> and{' '}
              <strong className="text-foreground">Save files and images</strong> permissions.
            </li>
            <li>Paste it into the app&apos;s settings window and click Connect.</li>
            <li>
              Copy text, a screenshot or a file path and press{' '}
              <span className="font-mono text-xs text-foreground">Ctrl+Alt+B</span>, or drop a file on the window.
            </li>
          </ol>

          <p className="text-xs text-muted-foreground">
            The installer isn&apos;t code-signed, so Windows SmartScreen may warn the first time: choose{' '}
            <strong className="text-foreground">More info</strong>, then{' '}
            <strong className="text-foreground">Run anyway</strong>. There is no automatic update; download the
            installer again from here (or from the{' '}
            <a
              href={DESKTOP_RELEASES_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-lime"
            >
              releases page
            </a>
            ) to update. Files up to 10 MB and images up to 5 MB.
          </p>
        </div>
      )}
    </Panel>
  );
}

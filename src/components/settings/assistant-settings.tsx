'use client';

import { useState } from 'react';
import { Bot, Check, Copy } from 'lucide-react';
import { toast } from 'sonner';
import Panel, { ProTag } from '@/components/shared/panel';
import { Button } from '@/components/ui/button';
import ProLocked from './pro-locked';

interface AssistantSettingsProps {
  isPro: boolean;
  /** The site's own address, e.g. https://bitbin.divyanshuagrahari.dev */
  siteUrl: string;
}

/**
 * Settings → AI assistants: how to connect Claude (or any Model Context Protocol client) to the
 * bin through `POST /api/v1/mcp`, with an API token from the panel above.
 */
export default function AssistantSettings({ isPro, siteUrl }: AssistantSettingsProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const endpoint = `${siteUrl}/api/v1/mcp`;
  const command = `claude mcp add --transport http bitbin ${endpoint} --header "Authorization: Bearer YOUR_TOKEN"`;

  async function copy(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      toast.success(`${label} copied`);
    } catch {
      toast.error('Could not copy. Select the text and copy it manually.');
    }
  }

  const copyable = (label: string, text: string) => (
    <div className="flex items-start gap-2">
      <code className="thin-scrollbar min-w-0 flex-1 overflow-x-auto rounded-md border border-border bg-card px-3 py-2 font-mono text-xs whitespace-nowrap text-foreground">
        {text}
      </code>
      <Button type="button" variant="outline" size="icon" onClick={() => copy(label, text)} aria-label={`Copy ${label.toLowerCase()}`}>
        {copied === label ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );

  return (
    <Panel
      id="assistants"
      icon={<Bot />}
      title="AI assistants"
      badge={!isPro ? <ProTag /> : undefined}
      description="Connect Claude, or any assistant that speaks the Model Context Protocol (MCP), so it can search your bin, read an item and save new ones."
    >
      {!isPro ? (
        <ProLocked>Connecting an assistant is part of BitBin Pro.</ProLocked>
      ) : (
        <div className="space-y-4">
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            <li>
              Create a token in <strong className="text-foreground">Browser extension</strong> above with the{' '}
              <strong className="text-foreground">Search and read items</strong>,{' '}
              <strong className="text-foreground">Save items</strong> and{' '}
              <strong className="text-foreground">List collections</strong> permissions. Leave out{' '}
              <strong className="text-foreground">Save items</strong> for an assistant that should only read.
            </li>
            <li>
              In Claude Code, run this in a terminal, with your token in place of{' '}
              <span className="font-mono text-xs text-foreground">YOUR_TOKEN</span>:
            </li>
          </ol>
          {copyable('Command', command)}
          <p className="text-sm text-muted-foreground">
            Any other MCP client: add a remote (HTTP) server at this address, with the header{' '}
            <span className="font-mono text-xs text-foreground">Authorization: Bearer YOUR_TOKEN</span>.
          </p>
          {copyable('Address', endpoint)}
          <p className="text-xs text-muted-foreground">
            Then ask it things like &ldquo;save this command to my BitBin under Infra&rdquo; or &ldquo;find my debounce
            hook in BitBin&rdquo;. The assistant can do only what the token allows, and revoking the token cuts it off at once.
          </p>
        </div>
      )}
    </Panel>
  );
}

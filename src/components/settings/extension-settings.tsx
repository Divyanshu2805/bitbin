'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import ConfirmDeleteDialog from '@/components/shared/confirm-delete-dialog';
import { Check, Copy, Download, KeyRound, Loader2, Plus, Puzzle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { createApiToken, revokeApiToken } from '@/actions/api-tokens';
import { formatRelativeDate } from '@/lib/utils/date';
import type { ApiTokenSummary } from '@/lib/db/api-tokens';

interface ExtensionSettingsProps {
  isPro: boolean;
  tokens: ApiTokenSummary[];
}

export default function ExtensionSettings({ isPro, tokens }: ExtensionSettingsProps) {
  const router = useRouter();
  const [name, setName] = useState('Browser extension');
  const [creating, setCreating] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState<ApiTokenSummary | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const result = await createApiToken({ name });
      if (!result.success || !result.data) {
        toast.error(result.fieldErrors?.name?.[0] ?? result.error ?? 'Failed to create token');
        return;
      }
      setNewToken(result.data.token);
      setCopied(false);
      toast.success('Token created. Copy it now; it won\'t be shown again.');
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setCreating(false);
    }
  }

  async function handleCopy() {
    if (!newToken) return;
    try {
      await navigator.clipboard.writeText(newToken);
      setCopied(true);
      toast.success('Token copied');
    } catch {
      toast.error('Could not copy. Select the token and copy it manually.');
    }
  }

  async function handleRevoke() {
    if (!revoking) return;
    const result = await revokeApiToken(revoking.id);
    if (!result.success) {
      toast.error(result.error ?? 'Failed to revoke token');
      return;
    }
    toast.success('Token revoked');
    setRevoking(null);
    router.refresh();
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Puzzle className="h-5 w-5" />
            <CardTitle>Browser extension</CardTitle>
            {!isPro && <Badge variant="secondary" className="text-xs">PRO</Badge>}
          </div>
          <CardDescription>
            Save selected text from any page with a shortcut. Create a token here and paste it into the
            extension&apos;s options.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isPro ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                The browser extension is part of BitBin Pro.
              </p>
              <Button asChild size="sm">
                <Link href="/upgrade">Upgrade to Pro</Link>
              </Button>
            </div>
          ) : (
            <>
            <div className="space-y-3">
              <Button asChild variant="outline">
                <a href="/api/extension/download" download>
                  <Download className="mr-2 h-4 w-4" />
                  Download extension
                </a>
              </Button>
              <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                <li>Unzip the download. You get a <span className="font-mono text-xs text-foreground">bitbin-extension</span> folder.</li>
                <li>
                  Open <span className="font-mono text-xs text-foreground">chrome://extensions</span> (or{' '}
                  <span className="font-mono text-xs text-foreground">edge://extensions</span>) and turn on{' '}
                  <strong className="text-foreground">Developer mode</strong>.
                </li>
                <li>Click <strong className="text-foreground">Load unpacked</strong> and choose that folder.</li>
                <li>Create a token below and paste it into the options page that opens.</li>
              </ol>
              <p className="text-xs text-muted-foreground">
                Keep the folder where it is. Chrome loads the extension from it. To update, download again and replace the folder&apos;s contents.
              </p>
            </div>

            <Separator />

            <form onSubmit={handleCreate} className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="token-name">Token name</Label>
                <Input
                  id="token-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={50}
                  placeholder="e.g. Chrome on laptop"
                />
              </div>
              <Button type="submit" disabled={creating || name.trim().length === 0}>
                {creating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Create token
              </Button>
            </form>
            </>
          )}

          {newToken && (
            <div className="space-y-2 rounded-md border border-lime/40 bg-lime/5 p-3">
              <p className="text-sm font-medium text-foreground">
                Your new token. Copy it now; it won&apos;t be shown again.
              </p>
              <div className="flex gap-2">
                <Input readOnly value={newToken} className="font-mono text-xs" onFocus={(e) => e.target.select()} />
                <Button type="button" variant="outline" size="icon" onClick={handleCopy} aria-label="Copy token">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}

          {tokens.length > 0 && (
            <>
              <Separator />
              <ul className="space-y-3">
                {tokens.map((token) => (
                  <li key={token.id} className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <KeyRound className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{token.name}</p>
                        <p className="truncate font-mono text-xs text-muted-foreground">
                          {token.prefix}… · created {formatRelativeDate(token.createdAt)} ·{' '}
                          {token.lastUsedAt ? `used ${formatRelativeDate(token.lastUsedAt)}` : 'never used'}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setRevoking(token)}
                      aria-label={`Revoke ${token.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>

      <ConfirmDeleteDialog
        open={revoking !== null}
        onOpenChange={(open) => !open && setRevoking(null)}
        title="Revoke token?"
        description={
          <>
            <strong>{revoking?.name}</strong> will stop working immediately. Anything using it, like the
            browser extension, will need a new token.
          </>
        }
        onConfirm={handleRevoke}
      />
    </>
  );
}

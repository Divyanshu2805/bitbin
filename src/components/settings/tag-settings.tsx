'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2, Pencil, Tags, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import Panel from '@/components/shared/panel';
import ConfirmDeleteDialog from '@/components/shared/confirm-delete-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { deleteTag, renameTag } from '@/actions/tags';
import { MAX_TAG_LENGTH } from '@/lib/validation';
import type { UserTag } from '@/lib/db/tags';

interface TagSettingsProps {
  tags: UserTag[];
}

export default function TagSettings({ tags }: TagSettingsProps) {
  const router = useRouter();
  const [filter, setFilter] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<UserTag | null>(null);

  const query = filter.trim().toLowerCase();
  const visible = query ? tags.filter((tag) => tag.name.toLowerCase().includes(query)) : tags;
  const existing = new Set(tags.map((tag) => tag.name));

  function startEdit(tag: UserTag) {
    setEditing(tag.name);
    setDraft(tag.name);
  }

  async function saveEdit(from: string) {
    const to = draft.trim();
    if (!to || to === from) {
      setEditing(null);
      return;
    }

    setSaving(true);
    try {
      const result = await renameTag({ from, to });
      if (!result.success) {
        toast.error(result.fieldErrors?.to?.[0] ?? result.error ?? 'Failed to rename tag');
        return;
      }
      toast.success(existing.has(to) ? `Merged "${from}" into "${to}"` : `Renamed "${from}" to "${to}"`);
      setEditing(null);
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    const result = await deleteTag({ name: deleting.name });
    if (!result.success) {
      toast.error(result.error ?? 'Failed to delete tag');
      return;
    }
    toast.success(`Removed "${deleting.name}"`);
    setDeleting(null);
    router.refresh();
  }

  return (
    <>
      <Panel
        id="tags"
        icon={<Tags />}
        title="Tags"
        description="Rename a tag everywhere, merge two by renaming one to the other's name, or remove one from all your items."
      >
        {tags.length === 0 ? (
          <p className="text-desc text-sm">No tags yet. Add some to an item and they will show up here.</p>
        ) : (
          <div className="space-y-4">
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter tags"
              aria-label="Filter tags"
              maxLength={MAX_TAG_LENGTH}
            />

            {visible.length === 0 ? (
              <p className="text-desc text-sm">No tag matches &ldquo;{filter.trim()}&rdquo;.</p>
            ) : (
              <ul className="max-h-80 divide-y divide-border overflow-y-auto rounded-md border border-border">
                {visible.map((tag) => (
                  <li key={tag.name} className="flex items-center gap-3 px-3 py-2">
                    {editing === tag.name ? (
                      <form
                        className="flex flex-1 items-center gap-2"
                        onSubmit={(e) => {
                          e.preventDefault();
                          void saveEdit(tag.name);
                        }}
                      >
                        <Input
                          autoFocus
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          maxLength={MAX_TAG_LENGTH}
                          aria-label={`New name for ${tag.name}`}
                          className="h-8"
                        />
                        <Button type="submit" size="icon" variant="outline" className="h-8 w-8" aria-label="Save" disabled={saving}>
                          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          aria-label="Cancel"
                          onClick={() => setEditing(null)}
                          disabled={saving}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </form>
                    ) : (
                      <>
                        <span className="min-w-0 flex-1 truncate font-mono text-sm">{tag.name}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {tag.count} item{tag.count !== 1 ? 's' : ''}
                        </span>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          aria-label={`Rename ${tag.name}`}
                          onClick={() => startEdit(tag)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          aria-label={`Remove ${tag.name}`}
                          onClick={() => setDeleting(tag)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Panel>

      <ConfirmDeleteDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Remove tag"
        description={
          <>
            Remove <span className="font-mono text-foreground">{deleting?.name}</span> from {deleting?.count}{' '}
            item{deleting?.count !== 1 ? 's' : ''}? The items stay; only the tag goes.
          </>
        }
        onConfirm={confirmDelete}
      />
    </>
  );
}

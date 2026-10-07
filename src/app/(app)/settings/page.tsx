import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import AccountSettings from '@/components/settings/account-settings';
import BillingSettings from '@/components/settings/billing-settings';
import DataSettings from '@/components/settings/data-settings';
import DesktopSettings from '@/components/settings/desktop-settings';
import EditorSettings from '@/components/settings/editor-settings';
import ExtensionSettings from '@/components/settings/extension-settings';
import TagSettings from '@/components/settings/tag-settings';
import { getApiTokens } from '@/lib/db/api-tokens';
import { getUserTags } from '@/lib/db/tags';
import { getUserWithSettings } from '@/lib/db/users';
import { getUserUsage } from '@/lib/usage';
import PageHeader from '@/components/shared/page-header';
import SettingsNav from '@/components/settings/settings-nav';

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  const user = await getUserWithSettings(session.user.id);

  if (!user) {
    redirect('/sign-in');
  }

  const isPro = session.user.isPro ?? false;

  const [usage, apiTokens, tags] = await Promise.all([
    getUserUsage(user.id, isPro),
    getApiTokens(user.id),
    getUserTags(user.id),
  ]);

  return (
    <>
      <div className="mx-auto max-w-5xl space-y-10">
        <PageHeader
          path="settings"
          title="Settings"
          description="Your editor, plan, browser extension, desktop app, tags, data and account."
        />

        <div className="grid gap-10 lg:grid-cols-[160px_minmax(0,1fr)]">
          <SettingsNav />

          <div className="space-y-6">
            <EditorSettings />
            <BillingSettings
              isPro={isPro}
              itemCount={usage.itemCount}
              collectionCount={usage.collectionCount}
            />
            <ExtensionSettings isPro={isPro} tokens={apiTokens} />
            <DesktopSettings isPro={isPro} />
            <TagSettings tags={tags} />
            <DataSettings isPro={isPro} />
            <AccountSettings hasPassword={user.hasPassword} />
          </div>
        </div>
      </div>
    </>
  );
}

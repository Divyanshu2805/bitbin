import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { getSidebarCollections } from '@/lib/db/collections';
import { getItemTypesWithCounts } from '@/lib/db/items';
import { getEditorPreferences, getUserById } from '@/lib/db/users';

// The app shell for every signed-in page: sidebar, top bar, status bar and the
// window-wide backdrop. It stays mounted across navigations, so the sidebar
// never reloads; only the page inside it does (with (app)/loading.tsx in its
// place meanwhile). router.refresh() after a mutation re-renders it too, which
// keeps the sidebar's counts current. Pages still check the session themselves:
// a layout doesn't re-run on client navigation.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  const user = await getUserById(session.user.id);

  // A JWT can outlive its account
  if (!user) {
    redirect('/sign-in');
  }

  const [itemTypes, sidebarCollections, editorPreferences] = await Promise.all([
    getItemTypesWithCounts(user.id),
    getSidebarCollections(user.id),
    getEditorPreferences(user.id),
  ]);

  return (
    <DashboardLayout
      itemTypes={itemTypes}
      sidebarCollections={sidebarCollections}
      user={user}
      editorPreferences={editorPreferences}
      isPro={session.user.isPro}
    >
      {children}
    </DashboardLayout>
  );
}

import { NextResponse } from 'next/server';
import { rejectUnlessCron } from '@/lib/cron-auth';
import { sweepOrphanedFiles } from '@/lib/orphan-sweep';

/**
 * Delete stored files no item points at. Called weekly by the Vercel cron in `vercel.json`, which
 * sends `Authorization: Bearer $CRON_SECRET`. Add `?dryRun=1` to see what it would delete without
 * deleting anything. What it will and won't touch is in `lib/orphan-sweep.ts`.
 */
export async function GET(request: Request) {
  const refused = rejectUnlessCron(request, 'File sweep');
  if (refused) return refused;

  const dryRun = new URL(request.url).searchParams.get('dryRun') === '1';

  try {
    const result = await sweepOrphanedFiles({ dryRun });

    if (result.aborted) {
      // Logged as an error so monitoring picks it up; nothing was deleted
      console.error('File sweep aborted:', result.aborted);
      return NextResponse.json({ error: 'Sweep aborted', ...result }, { status: 500 });
    }

    console.log(
      `File sweep${dryRun ? ' (dry run)' : ''}: scanned ${result.scanned}, ${result.eligible} old uploads, ` +
        `${result.orphans} orphans, ${result.deleted} deleted`
    );
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('File sweep failed:', error);
    return NextResponse.json({ error: 'Sweep failed' }, { status: 500 });
  }
}

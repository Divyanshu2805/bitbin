import { NextResponse } from 'next/server';
import { rejectUnlessCron } from '@/lib/cron-auth';
import { findUserIdByEmail, resetDemoAccount } from '@/lib/db/demo';
import { DEMO_EMAIL } from '@/lib/demo';
import { resetDemoContent } from '../../../../../prisma/demo-content';

/**
 * Put the public demo account back to the seeded library. Called once a day by
 * the Vercel cron in `vercel.json`, which sends `Authorization: Bearer
 * $CRON_SECRET`. Without `CRON_SECRET` set it refuses to run for anyone.
 */
export async function GET(request: Request) {
  const refused = rejectUnlessCron(request, 'Demo reset');
  if (refused) return refused;

  try {
    const demoId = await findUserIdByEmail(DEMO_EMAIL);

    // No demo account here (for example a fresh database): nothing to reset
    if (!demoId) {
      return NextResponse.json({ success: true, skipped: true });
    }

    await resetDemoAccount(demoId, resetDemoContent);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Demo reset failed:', error);
    return NextResponse.json({ error: 'Reset failed' }, { status: 500 });
  }
}

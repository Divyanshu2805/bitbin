import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { prisma } from '@/lib/prisma';
import { DEMO_EMAIL } from '@/lib/demo';
import { resetDemoContent } from '../../../../../prisma/demo-content';

/** True when `header` is exactly `Bearer <secret>`, compared in constant time. */
function isAuthorized(header: string | null, secret: string): boolean {
  const given = Buffer.from(header ?? '');
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Put the public demo account back to the seeded library. Called once a day by
 * the Vercel cron in `vercel.json`, which sends `Authorization: Bearer
 * $CRON_SECRET`. Without `CRON_SECRET` set it refuses to run for anyone.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error('Demo reset refused: CRON_SECRET is not set');
    return NextResponse.json({ error: 'Not configured' }, { status: 500 });
  }

  if (!isAuthorized(request.headers.get('authorization'), secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const demo = await prisma.user.findUnique({
      where: { email: DEMO_EMAIL },
      select: { id: true },
    });

    // No demo account here (for example a fresh database): nothing to reset
    if (!demo) {
      return NextResponse.json({ success: true, skipped: true });
    }

    await prisma.$transaction(
      async (tx) => {
        await resetDemoContent(tx, demo.id);
        // The sandbox blocks these, so this is a safety net
        await tx.user.update({
          where: { id: demo.id },
          data: { name: 'Demo User', isPro: false, stripeCustomerId: null, stripeSubscriptionId: null },
        });
      },
      { timeout: 30_000 }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Demo reset failed:', error);
    return NextResponse.json({ error: 'Reset failed' }, { status: 500 });
  }
}

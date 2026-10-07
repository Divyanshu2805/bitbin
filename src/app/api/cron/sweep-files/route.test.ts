import { describe, it, expect, vi, beforeEach } from 'vitest';

const { sweep } = vi.hoisted(() => ({ sweep: vi.fn() }));
vi.mock('@/lib/orphan-sweep', () => ({ sweepOrphanedFiles: sweep }));

import { GET } from './route';

const call = (authorization?: string, query = '') =>
  GET(new Request(`http://localhost/api/cron/sweep-files${query}`, { headers: authorization ? { authorization } : {} }));

const done = { scanned: 40, eligible: 30, orphans: 2, deleted: 2, dryRun: false, aborted: null };

describe('GET /api/cron/sweep-files', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.stubEnv('CRON_SECRET', 'top-secret-value');
    sweep.mockResolvedValue(done);
  });

  it('refuses everyone when CRON_SECRET is not set', async () => {
    vi.stubEnv('CRON_SECRET', '');
    const res = await call('Bearer ');

    expect(res.status).toBe(500);
    expect(sweep).not.toHaveBeenCalled();
  });

  it('rejects a missing, wrong or look-alike token', async () => {
    for (const header of [undefined, 'Bearer wrong', 'top-secret-value', 'bearer top-secret-value']) {
      expect((await call(header)).status).toBe(401);
    }
    expect(sweep).not.toHaveBeenCalled();
  });

  it('sweeps when the token is right', async () => {
    const res = await call('Bearer top-secret-value');

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, ...done });
    expect(sweep).toHaveBeenCalledWith({ dryRun: false });
  });

  it('passes ?dryRun=1 on', async () => {
    await call('Bearer top-secret-value', '?dryRun=1');
    expect(sweep).toHaveBeenCalledWith({ dryRun: true });
  });

  it('reports an aborted sweep as an error, so monitoring sees it', async () => {
    sweep.mockResolvedValue({ ...done, deleted: 0, aborted: 'too many orphans' });

    const res = await call('Bearer top-secret-value');

    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('Sweep aborted');
    expect(console.error).toHaveBeenCalledWith('File sweep aborted:', 'too many orphans');
  });

  it('hides a failure behind a generic message', async () => {
    sweep.mockRejectedValue(new Error('R2 credentials not configured'));

    const res = await call('Bearer top-secret-value');

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Sweep failed' });
  });
});

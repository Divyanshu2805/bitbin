import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkKnownMalware, isVirusCheckEnabled, sha256Hex } from './virus-check';

const fetchMock = vi.fn();
const file = Buffer.from('hello');

describe('virus check', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('is off without a key, and sends nothing', async () => {
    vi.stubEnv('VIRUSTOTAL_API_KEY', '');
    expect(isVirusCheckEnabled()).toBe(false);
    expect(await checkKnownMalware(file)).toEqual({ safe: true, checked: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('treats the .env.example placeholder as unset', () => {
    vi.stubEnv('VIRUSTOTAL_API_KEY', 'YOUR_VIRUSTOTAL_API_KEY');
    expect(isVirusCheckEnabled()).toBe(false);
  });

  describe('with a key', () => {
    beforeEach(() => vi.stubEnv('VIRUSTOTAL_API_KEY', 'vt-key'));

    it('sends only the hash, never the file', async () => {
      fetchMock.mockResolvedValue({ status: 404, ok: false });

      await checkKnownMalware(file);

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(`https://www.virustotal.com/api/v3/files/${sha256Hex(file)}`);
      expect(sha256Hex(file)).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
      expect(init.method).toBeUndefined();
      expect(init.body).toBeUndefined();
      expect(init.headers['x-apikey']).toBe('vt-key');
    });

    it('lets a file VirusTotal has never seen through', async () => {
      fetchMock.mockResolvedValue({ status: 404, ok: false });
      expect(await checkKnownMalware(file)).toEqual({ safe: true, checked: true });
    });

    it('blocks a file that engines flag as malicious', async () => {
      fetchMock.mockResolvedValue({
        status: 200,
        ok: true,
        json: async () => ({ data: { attributes: { last_analysis_stats: { malicious: 12, harmless: 40 } } } }),
      });
      const result = await checkKnownMalware(file);
      expect(result.safe).toBe(false);
    });

    it('passes a known-clean file', async () => {
      fetchMock.mockResolvedValue({
        status: 200,
        ok: true,
        json: async () => ({ data: { attributes: { last_analysis_stats: { malicious: 0 } } } }),
      });
      expect(await checkKnownMalware(file)).toEqual({ safe: true, checked: true });
    });

    it('does not block uploads when the lookup fails, times out or is rate limited', async () => {
      fetchMock.mockResolvedValueOnce({ status: 429, ok: false });
      expect(await checkKnownMalware(file)).toEqual({ safe: true, checked: false });

      fetchMock.mockRejectedValueOnce(new Error('timeout'));
      expect(await checkKnownMalware(file)).toEqual({ safe: true, checked: false });
    });
  });
});

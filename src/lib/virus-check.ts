import { createHash } from 'crypto';

// Optional check of an upload against VirusTotal's database of known malware, by hash.
//
// Only the SHA-256 of the file is sent, never the file, so nothing private leaves the server and
// a file VirusTotal has never seen simply passes. That makes this a safety net for known malware,
// not a scanner: a new sample gets through. It is off until VIRUSTOTAL_API_KEY is set, and a lookup
// that fails or times out lets the upload continue (the check must not take uploads down).

const TIMEOUT_MS = 4000;

export type MalwareCheck = { safe: true; checked: boolean } | { safe: false; reason: string };

export function isVirusCheckEnabled(): boolean {
  const key = process.env.VIRUSTOTAL_API_KEY;
  return !!key && !key.startsWith('YOUR_');
}

export function sha256Hex(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

export async function checkKnownMalware(buffer: Buffer): Promise<MalwareCheck> {
  if (!isVirusCheckEnabled()) return { safe: true, checked: false };

  try {
    const res = await fetch(`https://www.virustotal.com/api/v3/files/${sha256Hex(buffer)}`, {
      headers: { 'x-apikey': process.env.VIRUSTOTAL_API_KEY as string },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    // 404: VirusTotal has never seen this file
    if (res.status === 404) return { safe: true, checked: true };
    if (!res.ok) {
      console.error('VirusTotal lookup failed with status', res.status);
      return { safe: true, checked: false };
    }

    const data = (await res.json()) as {
      data?: { attributes?: { last_analysis_stats?: { malicious?: number } } };
    };
    const malicious = data.data?.attributes?.last_analysis_stats?.malicious ?? 0;
    return malicious > 0
      ? { safe: false, reason: 'This file was flagged as malware and cannot be uploaded.' }
      : { safe: true, checked: true };
  } catch (error) {
    console.error('VirusTotal lookup error:', error);
    return { safe: true, checked: false };
  }
}

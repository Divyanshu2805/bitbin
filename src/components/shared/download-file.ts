/**
 * Fetch a file from one of our own routes and hand it to the browser as a download. Returns the
 * file name on success, or the server's error message (for a toast).
 */
export async function downloadFrom(
  url: string,
  fallbackName: string
): Promise<{ ok: true; filename: string } | { ok: false; error: string }> {
  try {
    const res = await fetch(url);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, error: body.error || 'Export failed' };
    }

    const blob = await res.blob();
    const disposition = res.headers.get('Content-Disposition') || '';
    const filename = disposition.match(/filename="(.+?)"/)?.[1] || fallbackName;

    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);

    return { ok: true, filename };
  } catch {
    return { ok: false, error: 'Export failed' };
  }
}

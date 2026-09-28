// Code explanations, kept in this browser so an item's explanation is still
// there after closing it, refreshing or coming back tomorrow — until Explain is
// pressed again. Keyed by a hash of the item's title and code, so an edited
// snippet starts fresh. At most MAX_ENTRIES, oldest dropped first. Cleared on
// sign-out (clearExplanations). Storage can be unavailable (private windows,
// blocked site data): then it simply isn't saved.

const STORAGE_KEY = "bitbin:explanations";
const MAX_ENTRIES = 50;

type Stored = Record<string, { text: string; at: number }>;

/** A short, stable key for a title + code pair (djb2) */
export function explanationKey(title: string, code: string) {
  let hash = 5381;
  const input = `${title}\u0000${code}`;
  for (let i = 0; i < input.length; i++) hash = ((hash << 5) + hash + input.charCodeAt(i)) | 0;
  return `${(hash >>> 0).toString(36)}-${input.length.toString(36)}`;
}

function read(): Stored {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? (parsed as Stored) : {};
  } catch {
    return {};
  }
}

export function getExplanation(key: string): string | null {
  if (typeof window === "undefined") return null;
  const entry = read()[key];
  return entry && typeof entry.text === "string" ? entry.text : null;
}

export function saveExplanation(key: string, text: string) {
  try {
    const stored = read();
    stored[key] = { text, at: Date.now() };
    const kept = Object.entries(stored)
      .sort(([, a], [, b]) => b.at - a.at)
      .slice(0, MAX_ENTRIES);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(kept)));
  } catch {
    // Full or blocked storage: the explanation just isn't kept
  }
}

export function clearExplanations() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear
  }
}

// Requests still on their way, so reopening an item mid-draft picks the answer up
const pending = new Map<string, Promise<string | null>>();

export function getPendingExplanation(key: string) {
  return pending.get(key);
}

/** Runs `fetch` once per key at a time; the answer is saved when it lands. */
export function trackExplanation(key: string, fetch: () => Promise<string | null>) {
  const request = fetch()
    .then((text) => {
      if (text) saveExplanation(key, text);
      return text;
    })
    .finally(() => pending.delete(key));
  pending.set(key, request);
  return request;
}

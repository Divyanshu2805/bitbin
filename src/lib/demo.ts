/**
 * The public demo account (`demo@bitbin.dev`, created by the seed). Its login
 * is published so anyone can try the app, which makes it a sandbox: visitors
 * can add, edit and delete items, but can't do anything to the account itself
 * (password, name, deletion, billing), and a daily job puts its library back
 * (`/api/cron/reset-demo`).
 */
export const DEMO_EMAIL = 'demo@bitbin.dev';

export function isDemoEmail(email: string | null | undefined): boolean {
  return !!email && email.trim().toLowerCase() === DEMO_EMAIL;
}

/** The longest note, snippet or prompt the demo account may hold: it is a showcase, not storage. */
export const DEMO_MAX_CONTENT_LENGTH = 5000;

/**
 * What a visitor to the shared demo account may not put in an item. Everything they save is shown
 * to the next visitor until the daily reset, so a clickable link (a phishing or spam link) and a
 * huge paste are refused. Returns the message to show, or `null` when the item is fine.
 *
 * `existingUrl` is the link an item already has, so a visitor can still edit a seeded link item's
 * title without being able to point it somewhere else.
 */
export function demoItemRestriction(
  input: { typeName?: string | null; url?: string | null; content?: string | null },
  existingUrl?: string | null
): string | null {
  const url = input.url?.trim() || null;
  if (input.typeName === 'link' || (url && url !== (existingUrl ?? null))) {
    return demoBlockedMessage('save or change links');
  }
  if (input.content && input.content.length > DEMO_MAX_CONTENT_LENGTH) {
    return demoBlockedMessage(`save more than ${DEMO_MAX_CONTENT_LENGTH.toLocaleString('en-US')} characters in one item`);
  }
  return null;
}

/** The answer when the demo account tries something a sandbox account can't. */
export function demoBlockedMessage(action: string): string {
  return `The demo account can't ${action}. Create a free account to try it.`;
}

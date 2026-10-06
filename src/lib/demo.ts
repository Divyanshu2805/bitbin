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

/** The answer when the demo account tries something a sandbox account can't. */
export function demoBlockedMessage(action: string): string {
  return `The demo account can't ${action}. Create a free account to try it.`;
}

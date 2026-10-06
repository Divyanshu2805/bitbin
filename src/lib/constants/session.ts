// How long a sign-in lasts. Shared by the full NextAuth config (auth.ts) and the edge-safe one the
// proxy uses (auth.config.ts), so the two never disagree.

/** A session cookie lives 14 days (Auth.js' default is 30), so a stolen or forgotten one dies sooner. */
export const SESSION_MAX_AGE_SECONDS = 14 * 24 * 60 * 60;

/** An active session is re-issued at most once a day, so a user who keeps coming back stays signed in. */
export const SESSION_UPDATE_AGE_SECONDS = 24 * 60 * 60;

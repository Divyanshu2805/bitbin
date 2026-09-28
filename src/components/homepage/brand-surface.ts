/**
 * The homepage and the auth brand panel, light theme only: a green-grey page
 * deeper than the app's paper, so white demo windows stand out, with darker
 * secondary text and borders, and stronger falling bits (`--rain-strength`,
 * read by LandingBackdrop). Utilities rather than a globals.css rule, so they
 * sit on the element that needs them.
 */
export const BRAND_SURFACE =
  "not-dark:[--background:#dce8cc] not-dark:[--muted-foreground:#3f4549] not-dark:[--border:#c3d1ae] not-dark:[--rain-strength:1.6]";

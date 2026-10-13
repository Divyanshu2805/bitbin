"use server";

import { signIn } from "@/auth";

// GitHub brings the user straight back to the dashboard. Coming back through the
// sign-in page to slide from there froze it: the slide pictures the page on its
// first frame, mid-entrance, and holds that still image until the dashboard loads.
export async function signInWithGitHub() {
  await signIn("github", { redirectTo: "/dashboard" });
}

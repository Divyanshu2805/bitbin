"use server";

import { signIn } from "@/auth";

// GitHub brings the user back to the sign-in page (`?via=github`), which then
// slides into the dashboard like an email sign-in does, instead of a full page
// load that shows the dashboard's loading screen.
export async function signInWithGitHub() {
  await signIn("github", { redirectTo: "/sign-in?via=github" });
}

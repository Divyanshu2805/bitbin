import { Github } from "lucide-react";
import { signInWithGitHub } from "@/actions/auth";
import { ContribGrid } from "@/components/shared/contrib-grid";

/** GitHub first — the one-click path for developers — then a divider into the email form. */
export default function GitHubAuthSection() {
  return (
    <>
      <form action={signInWithGitHub}>
        <button type="submit" className="btn gh-button h-12 w-full rounded-md text-sm">
          <ContribGrid rows={5} />
          <span className="relative z-10 inline-flex items-center gap-2">
            <Github className="gh-icon h-4 w-4" />
            Continue with GitHub
          </span>
        </button>
      </form>

      <div className="flex items-center gap-3 font-mono text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or with email
        <span className="h-px flex-1 bg-border" />
      </div>
    </>
  );
}

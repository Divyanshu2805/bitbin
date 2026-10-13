import { Github } from "lucide-react";
import { signInWithGitHub } from "@/actions/auth";
import { ContribGrid } from "@/components/shared/contrib-grid";

/** GitHub first — the one-click path for developers — then a divider into the email form. */
export default function GitHubAuthSection() {
  return (
    <>
      <form action={signInWithGitHub}>
        <button type="submit" className="btn gh-button auth-button">
          <ContribGrid rows={5} />
          <span className="relative z-10 inline-flex items-center gap-2">
            <Github className="gh-icon size-4" />
            Continue with GitHub
          </span>
        </button>
      </form>

      <p className="auth-divider">or with email</p>
    </>
  );
}

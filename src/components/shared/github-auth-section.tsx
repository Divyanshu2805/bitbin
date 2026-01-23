import { Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signInWithGitHub } from "@/actions/auth";

export default function GitHubAuthSection() {
  return (
    <>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      <form action={signInWithGitHub}>
        <Button variant="outline" className="w-full" type="submit">
          <Github className="mr-2 h-4 w-4" />
          GitHub
        </Button>
      </form>
    </>
  );
}

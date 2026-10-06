"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { signOutEverywhere } from "@/actions/settings";
import { Loader2, LogOut, MonitorSmartphone, X } from "lucide-react";

interface SignOutEverywhereDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SignOutEverywhereDialog({ open, onOpenChange }: SignOutEverywhereDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClose = () => {
    if (!isLoading) onOpenChange(false);
  };

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      const result = await signOutEverywhere();
      if (!result.success) {
        toast.error(result.error || "Could not sign you out everywhere");
        setIsLoading(false);
        return;
      }
      toast.success("Signed out everywhere");
      // The server has ended every session; this clears the cookie in this browser too
      await signOut({ callbackUrl: "/sign-in" });
    } catch {
      toast.error("Could not sign you out everywhere");
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-lime/10">
              <MonitorSmartphone className="h-5 w-5 text-lime" />
            </div>
            <div>
              <AlertDialogTitle>Sign out everywhere?</AlertDialogTitle>
              <AlertDialogDescription>
                Every browser and device, this one included, will need to sign in again.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <p className="text-sm text-muted-foreground">
          Use this if you signed in on a shared computer or think someone else has your session. Changing your
          password does the same thing.
        </p>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
            <X className="h-4 w-4" />
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
            Sign out everywhere
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}

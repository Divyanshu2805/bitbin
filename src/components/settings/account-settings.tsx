"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Key, Trash2 } from "lucide-react";
import ChangePasswordDialog from "./change-password-dialog";
import DeleteAccountDialog from "./delete-account-dialog";

interface AccountSettingsProps {
  hasPassword: boolean;
}

export default function AccountSettings({ hasPassword }: AccountSettingsProps) {
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Manage your account security and preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Change Password Section */}
          {hasPassword && (
            <div className="flex items-center justify-between py-3 border-b border-border">
              <div>
                <h3 className="font-medium">Password</h3>
                <p className="text-sm text-muted-foreground">
                  Update your password to keep your account secure
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowChangePassword(true)}
              >
                <Key className="mr-2 h-4 w-4" />
                Change Password
              </Button>
            </div>
          )}

          {/* Delete Account Section */}
          <div className="flex items-center justify-between py-3">
            <div>
              <h3 className="font-medium text-destructive">Delete Account</h3>
              <p className="text-sm text-muted-foreground">
                Permanently delete your account and all associated data
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteAccount(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <ChangePasswordDialog
        open={showChangePassword}
        onOpenChange={setShowChangePassword}
      />
      <DeleteAccountDialog
        open={showDeleteAccount}
        onOpenChange={setShowDeleteAccount}
      />
    </>
  );
}

"use client";

import { useState } from "react";
import Panel from "@/components/shared/panel";
import { Button } from "@/components/ui/button";
import { Key, MonitorSmartphone, ShieldAlert, Trash2 } from "lucide-react";
import ChangePasswordDialog from "./change-password-dialog";
import DeleteAccountDialog from "./delete-account-dialog";
import SignOutEverywhereDialog from "./sign-out-everywhere-dialog";

interface AccountSettingsProps {
  hasPassword: boolean;
}

export default function AccountSettings({ hasPassword }: AccountSettingsProps) {
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [showSignOutEverywhere, setShowSignOutEverywhere] = useState(false);

  return (
    <>
      <Panel
        id="account"
        tone="danger"
        icon={<ShieldAlert />}
        title="Account"
        description="Security, and the way out."
      >
        <div className="-my-3">
          {/* Change Password Section */}
          {hasPassword && (
            <div className="flex flex-col gap-3 border-b border-border/60 py-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-medium">Password</h3>
                <p className="text-desc text-sm">
                  Update your password to keep your account secure
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowChangePassword(true)}
              >
                <Key className="h-4 w-4" />
                Change Password
              </Button>
            </div>
          )}

          {/* Sessions */}
          <div className="flex flex-col gap-3 border-b border-border/60 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-medium">Sessions</h3>
              <p className="text-desc text-sm">
                Sign out of every browser and device. Sessions also end by themselves after 14 days.
              </p>
            </div>
            <Button variant="outline" onClick={() => setShowSignOutEverywhere(true)}>
              <MonitorSmartphone className="h-4 w-4" />
              Sign out everywhere
            </Button>
          </div>

          {/* Delete Account Section */}
          <div className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-medium text-destructive">Delete Account</h3>
              <p className="text-desc text-sm">
                Permanently delete your account and all associated data
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteAccount(true)}
            >
              <Trash2 className="h-4 w-4" />
              Delete Account
            </Button>
          </div>
        </div>
      </Panel>

      {/* Dialogs */}
      <ChangePasswordDialog
        open={showChangePassword}
        onOpenChange={setShowChangePassword}
      />
      <SignOutEverywhereDialog open={showSignOutEverywhere} onOpenChange={setShowSignOutEverywhere} />
      <DeleteAccountDialog
        open={showDeleteAccount}
        onOpenChange={setShowDeleteAccount}
        hasPassword={hasPassword}
      />
    </>
  );
}

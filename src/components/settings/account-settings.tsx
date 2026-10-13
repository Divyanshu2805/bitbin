"use client";

import { useState } from "react";
import Panel from "@/components/shared/panel";
import { Button } from "@/components/ui/button";
import { Key, MonitorSmartphone, ShieldAlert, Trash2 } from "lucide-react";
import { SettingRow, SettingRows } from "./setting-row";
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
        icon={<ShieldAlert />}
        title="Account"
        description="Security, and the way out."
      >
        <SettingRows>
          {hasPassword && (
            <SettingRow title="Password" description="Update your password to keep your account secure.">
              <Button variant="outline" onClick={() => setShowChangePassword(true)}>
                <Key className="h-4 w-4" />
                Change password
              </Button>
            </SettingRow>
          )}

          <SettingRow
            title="Sessions"
            description="Sign out of every browser and device. Sessions also end by themselves after 14 days."
          >
            <Button variant="outline" onClick={() => setShowSignOutEverywhere(true)}>
              <MonitorSmartphone className="h-4 w-4" />
              Sign out everywhere
            </Button>
          </SettingRow>

          <SettingRow danger title="Delete account" description="Permanently delete your account and everything in it.">
            <Button variant="danger" onClick={() => setShowDeleteAccount(true)}>
              <Trash2 className="h-4 w-4" />
              Delete account
            </Button>
          </SettingRow>
        </SettingRows>
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

"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2Icon, UserMinus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  updateOrgNameAction,
  updateTimezoneAction,
  uploadLogoAction,
  updateMemberRoleAction,
  removeMemberAction,
  updateDisplayNameAction,
  changePasswordAction,
  deleteOrganizationAction,
} from "@/app/(app)/settings/actions";
import { InviteModal } from "@/components/app/InviteModal";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OrgData {
  name: string;
  timezone: string;
  logoUrl: string | null;
  plan: string;
}

export interface MemberData {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: Date;
}

export interface CurrentUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

// ---------------------------------------------------------------------------
// Timezone list
// ---------------------------------------------------------------------------

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
  "America/Toronto",
  "America/Vancouver",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Madrid",
  "Europe/Rome",
  "Europe/Amsterdam",
  "Europe/Moscow",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Australia/Sydney",
  "Pacific/Auckland",
];

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  TECHNICIAN: "Technician",
  READONLY: "Read Only",
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface SettingsPageProps {
  org: OrgData;
  members: MemberData[];
  currentUser: CurrentUser;
  activeTab: string;
}

export function SettingsPage({ org, members, currentUser, activeTab }: SettingsPageProps) {
  const router = useRouter();
  const isOwner = currentUser.role === "OWNER";

  const validTabs = ["general", "team", "account"];
  const tab = validTabs.includes(activeTab) ? activeTab : "general";

  function handleTabChange(value: string | number | null) {
    if (typeof value === "string") {
      router.replace(`/settings?tab=${value}`, { scroll: false });
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your organization, team, and account.
        </p>
      </div>

      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>

        {/* ---------------------------------------------------------------- */}
        {/* General                                                           */}
        {/* ---------------------------------------------------------------- */}
        <TabsContent value="general">
          <div className="flex flex-col gap-6 max-w-lg">
            {/* Org name */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Organization Name</CardTitle>
              </CardHeader>
              <CardContent>
                <OrgNameForm currentName={org.name} disabled={!isOwner} />
              </CardContent>
            </Card>

            {/* Timezone */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Timezone</CardTitle>
                <CardDescription>Used for scheduled reports and timestamps.</CardDescription>
              </CardHeader>
              <CardContent>
                <TimezoneForm currentTimezone={org.timezone} disabled={!isOwner} />
              </CardContent>
            </Card>

            {/* Logo */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Organization Logo</CardTitle>
                <CardDescription>PNG or JPG, max 500 KB. Shown in reports.</CardDescription>
              </CardHeader>
              <CardContent>
                <LogoUploadForm currentLogoUrl={org.logoUrl} disabled={!isOwner} />
              </CardContent>
            </Card>

            {!isOwner && (
              <p className="text-sm text-muted-foreground">
                Only the organization owner can edit these settings.
              </p>
            )}
          </div>
        </TabsContent>

        {/* ---------------------------------------------------------------- */}
        {/* Team                                                              */}
        {/* ---------------------------------------------------------------- */}
        <TabsContent value="team">
          <div className="flex flex-col gap-4">
            {isOwner && (
              <div className="flex justify-end">
                <InviteModal />
              </div>
            )}
            <TeamTable
              members={members}
              currentUserId={currentUser.id}
              isOwner={isOwner}
            />
          </div>
        </TabsContent>

        {/* ---------------------------------------------------------------- */}
        {/* Account                                                           */}
        {/* ---------------------------------------------------------------- */}
        <TabsContent value="account">
          <div className="flex flex-col gap-6 max-w-lg">
            {/* Display name */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Display Name</CardTitle>
              </CardHeader>
              <CardContent>
                <DisplayNameForm currentName={currentUser.name} />
              </CardContent>
            </Card>

            {/* Email */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Email Address</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <p className="text-sm font-medium">{currentUser.email}</p>
                <p className="text-xs text-muted-foreground">
                  Email changes require re-authentication via Supabase Dashboard.
                </p>
              </CardContent>
            </Card>

            {/* Password */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Change Password</CardTitle>
              </CardHeader>
              <CardContent>
                <ChangePasswordForm />
              </CardContent>
            </Card>

            {/* Danger zone */}
            {isOwner && (
              <Card className="border-destructive/50">
                <CardHeader>
                  <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
                  <CardDescription>
                    Permanently delete your organization and all associated data.
                    This action cannot be undone.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DeleteOrgSection orgName={org.name} />
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------------------------------------------------------------------
// General forms
// ---------------------------------------------------------------------------

function OrgNameForm({ currentName, disabled }: { currentName: string; disabled: boolean }) {
  const [name, setName] = React.useState(currentName);
  const [saving, setSaving] = React.useState(false);

  async function handleSave() {
    setSaving(true);
    const result = await updateOrgNameAction(name);
    setSaving(false);
    if (result.success) toast.success("Organization name updated.");
    else toast.error(result.error);
  }

  return (
    <div className="flex gap-2">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={disabled}
        className="max-w-xs"
      />
      <Button onClick={handleSave} disabled={disabled || saving} variant="outline" size="sm">
        {saving ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}

function TimezoneForm({ currentTimezone, disabled }: { currentTimezone: string; disabled: boolean }) {
  const [tz, setTz] = React.useState(currentTimezone);
  const [saving, setSaving] = React.useState(false);

  async function handleSave() {
    setSaving(true);
    const result = await updateTimezoneAction(tz);
    setSaving(false);
    if (result.success) toast.success("Timezone updated.");
    else toast.error(result.error);
  }

  return (
    <div className="flex gap-2">
      <Select
        value={tz}
        onChange={(e) => setTz(e.target.value)}
        disabled={disabled}
        className="max-w-xs"
      >
        {TIMEZONES.map((t) => (
          <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
        ))}
      </Select>
      <Button onClick={handleSave} disabled={disabled || saving} variant="outline" size="sm">
        {saving ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}

function LogoUploadForm({
  currentLogoUrl,
  disabled,
}: {
  currentLogoUrl: string | null;
  disabled: boolean;
}) {
  const [preview, setPreview] = React.useState<string | null>(currentLogoUrl);
  const [uploading, setUploading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleUpload() {
    const file = inputRef.current?.files?.[0];
    if (!file) {
      toast.error("Select a file first.");
      return;
    }
    const formData = new FormData();
    formData.append("logo", file);
    setUploading(true);
    const result = await uploadLogoAction(formData);
    setUploading(false);
    if (result.success) toast.success("Logo updated.");
    else toast.error(result.error);
  }

  return (
    <div className="flex flex-col gap-3">
      {preview && (
        <Image
          src={preview}
          alt="Organization logo"
          width={80}
          height={80}
          className="h-20 w-20 rounded-md object-contain border bg-muted/20"
          unoptimized
        />
      )}
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg"
          disabled={disabled}
          onChange={handleFileChange}
          className="max-w-xs"
        />
        <Button
          onClick={handleUpload}
          disabled={disabled || uploading}
          variant="outline"
          size="sm"
        >
          {uploading ? "Uploading…" : "Upload"}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Team table
// ---------------------------------------------------------------------------

function TeamTable({
  members,
  currentUserId,
  isOwner,
}: {
  members: MemberData[];
  currentUserId: string;
  isOwner: boolean;
}) {
  const [removing, setRemoving] = React.useState<string | null>(null);

  async function handleRoleChange(memberId: string, role: string) {
    const result = await updateMemberRoleAction(memberId, role);
    if (!result.success) toast.error(result.error);
    else toast.success("Role updated.");
  }

  async function handleRemove(memberId: string) {
    setRemoving(memberId);
    const result = await removeMemberAction(memberId);
    setRemoving(null);
    if (!result.success) toast.error(result.error);
    else toast.success("Member removed.");
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Name</th>
            <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Email</th>
            <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Role</th>
            <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Joined</th>
            {isOwner && <th className="w-12" />}
          </tr>
        </thead>
        <tbody className="divide-y">
          {members.map((m) => (
            <tr key={m.id} className="hover:bg-muted/20">
              <td className="px-4 py-3 font-medium">
                {m.name ?? "—"}
                {m.id === currentUserId && (
                  <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>
                )}
              </td>
              <td className="px-4 py-3 text-muted-foreground">{m.email}</td>
              <td className="px-4 py-3">
                {isOwner && m.id !== currentUserId ? (
                  <Select
                    value={m.role}
                    onChange={(e) => handleRoleChange(m.id, e.target.value)}
                    className="h-7 text-xs w-32"
                  >
                    <option value="OWNER">Owner</option>
                    <option value="TECHNICIAN">Technician</option>
                    <option value="READONLY">Read Only</option>
                  </Select>
                ) : (
                  <Badge variant="default" className="text-xs">
                    {ROLE_LABELS[m.role] ?? m.role}
                  </Badge>
                )}
              </td>
              <td className="px-4 py-3 text-muted-foreground text-xs">
                {new Date(m.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </td>
              {isOwner && (
                <td className="px-2 py-3">
                  {m.id !== currentUserId && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={removing === m.id}
                      onClick={() => handleRemove(m.id)}
                      className="text-destructive hover:text-destructive"
                      aria-label={`Remove ${m.email}`}
                    >
                      <UserMinus className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Account forms
// ---------------------------------------------------------------------------

function DisplayNameForm({ currentName }: { currentName: string | null }) {
  const [name, setName] = React.useState(currentName ?? "");
  const [saving, setSaving] = React.useState(false);

  async function handleSave() {
    setSaving(true);
    const result = await updateDisplayNameAction(name);
    setSaving(false);
    if (result.success) toast.success("Display name updated.");
    else toast.error(result.error);
  }

  return (
    <div className="flex gap-2">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
        className="max-w-xs"
      />
      <Button onClick={handleSave} disabled={saving} variant="outline" size="sm">
        {saving ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}

function ChangePasswordForm() {
  const [current, setCurrent] = React.useState("");
  const [next, setNext] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (next !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }
    setSaving(true);
    const result = await changePasswordAction(current, next);
    setSaving(false);
    if (result.success) {
      toast.success("Password updated.");
      setCurrent(""); setNext(""); setConfirm("");
    } else {
      toast.error(result.error);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="current-pw">Current password</Label>
        <Input
          id="current-pw"
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          autoComplete="current-password"
          className="max-w-xs"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="new-pw">New password</Label>
        <Input
          id="new-pw"
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          autoComplete="new-password"
          className="max-w-xs"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirm-pw">Confirm new password</Label>
        <Input
          id="confirm-pw"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          className="max-w-xs"
        />
      </div>
      <Button type="submit" disabled={saving} variant="outline" size="sm" className="w-fit">
        {saving ? "Updating…" : "Update Password"}
      </Button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Delete org
// ---------------------------------------------------------------------------

function DeleteOrgSection({ orgName }: { orgName: string }) {
  const [open, setOpen] = React.useState(false);
  const [confirmInput, setConfirmInput] = React.useState("");
  const [deleting, setDeleting] = React.useState(false);

  async function handleDelete() {
    setDeleting(true);
    await deleteOrganizationAction(confirmInput);
    setDeleting(false);
  }

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        className="gap-1.5"
        onClick={() => setOpen(true)}
      >
        <Trash2Icon className="h-3.5 w-3.5" />
        Delete Organization
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete organization</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{orgName}</strong> and all clients, devices,
              and audit logs. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-1.5 py-2">
            <Label htmlFor="confirm-delete">
              Type <strong>{orgName}</strong> to confirm
            </Label>
            <Input
              id="confirm-delete"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder={orgName}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel render={<Button variant="outline" />}>
              Cancel
            </AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={confirmInput !== orgName || deleting}
              onClick={handleDelete}
            >
              {deleting ? "Deleting…" : "Delete Organization"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

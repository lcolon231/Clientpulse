"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { inviteUserAction } from "@/app/(app)/dashboard/actions";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const schema = z.object({
  email: z.string().email("Invalid email address"),
});

type FormValues = z.infer<typeof schema>;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * "Invite Technician" button + modal.
 *
 * This component is only rendered when the current user is an OWNER (enforced
 * in the Server Component that renders the dashboard). The server action
 * (inviteUserAction) has its own requireOwner() check — so even if someone
 * injects this component into the page, the action will still 403.
 */
export function InviteModal() {
  const [open, setOpen] = useState(false);
  const [successEmail, setSuccessEmail] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      // Reset form state when the modal closes.
      reset();
      setSuccessEmail(null);
      setServerError(null);
    }
  }

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const result = await inviteUserAction(values);

    if (result.success) {
      setSuccessEmail(values.email);
      reset();
    } else {
      setServerError(result.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* Base UI's Trigger uses the `render` prop (not asChild) to delegate
          rendering to our Button component. */}
      <DialogTrigger render={<Button size="sm" className="gap-1.5" />}>
        <UserPlus className="h-4 w-4" />
        Invite Technician
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite a technician</DialogTitle>
          <DialogDescription>
            They&apos;ll receive an email with a link to set up their account.
            They&apos;ll be added to your organization as a Technician.
          </DialogDescription>
        </DialogHeader>

        {successEmail ? (
          <div className="space-y-4 py-2">
            <p className="text-sm">
              Invite sent to{" "}
              <span className="font-medium">{successEmail}</span>.
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleOpenChange(false)}
            >
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="invite-email">Email address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="technician@example.com"
                autoComplete="off"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-destructive text-xs">
                  {errors.email.message}
                </p>
              )}
            </div>

            {serverError && (
              <p className="text-destructive text-sm">{serverError}</p>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Sending invite…" : "Send invite"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

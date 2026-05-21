"use client";

import * as React from "react";

import type { Client } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { updateClientAction } from "@/app/(app)/clients/actions";

interface EditClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
}

export function EditClientDialog({
  open,
  onOpenChange,
  client,
}: EditClientDialogProps) {
  const { toast } = useToast();
  const [fields, setFields] = React.useState({
    name: client.name,
    industry: client.industry ?? "",
    primaryContact: client.primaryContact ?? "",
    primaryContactEmail: client.primaryContactEmail ?? "",
    slaTier: client.slaTier as "BASIC" | "STANDARD" | "PREMIUM",
    notes: client.notes ?? "",
  });
  const [pending, setPending] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // Sync when client prop changes (e.g. after an update)
  React.useEffect(() => {
    setFields({
      name: client.name,
      industry: client.industry ?? "",
      primaryContact: client.primaryContact ?? "",
      primaryContactEmail: client.primaryContactEmail ?? "",
      slaTier: client.slaTier as "BASIC" | "STANDARD" | "PREMIUM",
      notes: client.notes ?? "",
    });
  }, [client]);

  function set(key: keyof typeof fields, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!fields.name.trim()) e.name = "Name is required";
    if (!fields.primaryContact.trim()) e.primaryContact = "Primary contact is required";
    if (
      fields.primaryContactEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.primaryContactEmail)
    ) {
      e.primaryContactEmail = "Invalid email";
    }
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setPending(true);
    const result = await updateClientAction(client.id, fields);
    setPending(false);

    if (result.success) {
      toast({ variant: "success", title: "Client updated successfully" });
      onOpenChange(false);
    } else {
      toast({ variant: "error", title: result.error });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Client</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-name"
              value={fields.name}
              onChange={(e) => set("name", e.target.value)}
              aria-invalid={!!errors.name}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-industry">Industry</Label>
            <Input
              id="edit-industry"
              value={fields.industry}
              onChange={(e) => set("industry", e.target.value)}
              placeholder="Healthcare, Finance, Retail…"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-contact">
                Primary Contact <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-contact"
                value={fields.primaryContact}
                onChange={(e) => set("primaryContact", e.target.value)}
                aria-invalid={!!errors.primaryContact}
              />
              {errors.primaryContact && (
                <p className="text-xs text-destructive">{errors.primaryContact}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-email">Contact Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={fields.primaryContactEmail}
                onChange={(e) => set("primaryContactEmail", e.target.value)}
                aria-invalid={!!errors.primaryContactEmail}
              />
              {errors.primaryContactEmail && (
                <p className="text-xs text-destructive">{errors.primaryContactEmail}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-sla">
              SLA Tier <span className="text-destructive">*</span>
            </Label>
            <Select
              id="edit-sla"
              value={fields.slaTier}
              onChange={(e) =>
                set("slaTier", e.target.value as "BASIC" | "STANDARD" | "PREMIUM")
              }
            >
              <option value="BASIC">Basic</option>
              <option value="STANDARD">Standard</option>
              <option value="PREMIUM">Premium</option>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-notes">Notes</Label>
            <Textarea
              id="edit-notes"
              value={fields.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter showCloseButton>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

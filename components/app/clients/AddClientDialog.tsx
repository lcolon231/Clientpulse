"use client";

import * as React from "react";

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
import { createClientAction } from "@/app/(app)/clients/actions";

interface AddClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const INITIAL = {
  name: "",
  industry: "",
  primaryContact: "",
  primaryContactEmail: "",
  slaTier: "BASIC" as const,
  notes: "",
};

export function AddClientDialog({ open, onOpenChange }: AddClientDialogProps) {
  const { toast } = useToast();
  const [fields, setFields] = React.useState(INITIAL);
  const [pending, setPending] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  function set(key: keyof typeof INITIAL, value: string) {
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
    const result = await createClientAction(fields);
    setPending(false);

    if (result.success) {
      toast({ variant: "success", title: "Client created successfully" });
      setFields(INITIAL);
      onOpenChange(false);
    } else {
      toast({ variant: "error", title: result.error });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Client</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="add-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="add-name"
              value={fields.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Acme Corporation"
              aria-invalid={!!errors.name}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name}</p>
            )}
          </div>

          {/* Industry */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="add-industry">Industry</Label>
            <Input
              id="add-industry"
              value={fields.industry}
              onChange={(e) => set("industry", e.target.value)}
              placeholder="Healthcare, Finance, Retail…"
            />
          </div>

          {/* Primary contact */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="add-contact">
                Primary Contact <span className="text-destructive">*</span>
              </Label>
              <Input
                id="add-contact"
                value={fields.primaryContact}
                onChange={(e) => set("primaryContact", e.target.value)}
                placeholder="Jane Smith"
                aria-invalid={!!errors.primaryContact}
              />
              {errors.primaryContact && (
                <p className="text-xs text-destructive">{errors.primaryContact}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="add-email">Contact Email</Label>
              <Input
                id="add-email"
                type="email"
                value={fields.primaryContactEmail}
                onChange={(e) => set("primaryContactEmail", e.target.value)}
                placeholder="jane@acme.com"
                aria-invalid={!!errors.primaryContactEmail}
              />
              {errors.primaryContactEmail && (
                <p className="text-xs text-destructive">{errors.primaryContactEmail}</p>
              )}
            </div>
          </div>

          {/* SLA Tier */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="add-sla">
              SLA Tier <span className="text-destructive">*</span>
            </Label>
            <Select
              id="add-sla"
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

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="add-notes">Notes</Label>
            <Textarea
              id="add-notes"
              value={fields.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Any relevant notes about this client…"
              rows={3}
            />
          </div>

          <DialogFooter showCloseButton>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create Client"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

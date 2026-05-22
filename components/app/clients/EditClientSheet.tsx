"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import type { Client } from "@prisma/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  clientSchema,
  INDUSTRY_OPTIONS,
  SLA_TIER_LABELS,
  type ClientFormValues,
} from "@/types";
import { updateClient } from "@/lib/actions/clients";

interface EditClientSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
}

export function EditClientSheet({ open, onOpenChange, client }: EditClientSheetProps) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    values: {
      name: client.name,
      industry: client.industry as ClientFormValues["industry"],
      slaTier: client.slaTier,
      primaryContact: client.primaryContact ?? "",
      notes: client.notes ?? "",
    },
  });

  async function onSubmit(values: ClientFormValues) {
    const result = await updateClient(client.id, values);
    if (result.success) {
      toast.success("Client updated successfully");
      onOpenChange(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Edit Client</SheetTitle>
          <SheetDescription>Update this client&apos;s information.</SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4 px-4 pb-4"
          noValidate
        >
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-name"
              placeholder="Acme Corporation"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Industry */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-industry">
              Industry <span className="text-destructive">*</span>
            </Label>
            <Select
              id="edit-industry"
              aria-invalid={!!errors.industry}
              {...register("industry")}
            >
              {INDUSTRY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </Select>
            {errors.industry && (
              <p className="text-xs text-destructive">{errors.industry.message}</p>
            )}
          </div>

          {/* SLA Tier */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-sla">
              SLA Tier <span className="text-destructive">*</span>
            </Label>
            <Select
              id="edit-sla"
              aria-invalid={!!errors.slaTier}
              {...register("slaTier")}
            >
              {(Object.entries(SLA_TIER_LABELS) as [string, string][]).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            {errors.slaTier && (
              <p className="text-xs text-destructive">{errors.slaTier.message}</p>
            )}
          </div>

          {/* Primary Contact */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-contact">Primary Contact</Label>
            <Input
              id="edit-contact"
              placeholder="Jane Smith"
              aria-invalid={!!errors.primaryContact}
              {...register("primaryContact")}
            />
            {errors.primaryContact && (
              <p className="text-xs text-destructive">{errors.primaryContact.message}</p>
            )}
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-notes">Notes</Label>
            <Textarea
              id="edit-notes"
              placeholder="Any relevant notes about this client…"
              rows={3}
              aria-invalid={!!errors.notes}
              {...register("notes")}
            />
            {errors.notes && (
              <p className="text-xs text-destructive">{errors.notes.message}</p>
            )}
          </div>

          <SheetFooter>
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Saving…" : "Save Changes"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

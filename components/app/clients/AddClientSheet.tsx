"use client";

import { Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

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
import { createClient } from "@/lib/actions/clients";

interface AddClientSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddClientSheet({ open, onOpenChange }: AddClientSheetProps) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: "",
      industry: "Other",
      slaTier: "STANDARD",
      primaryContact: "",
      notes: "",
    },
  });

  async function onSubmit(values: ClientFormValues) {
    const result = await createClient(values);
    if (result.success) {
      toast.success("Client created successfully");
      reset();
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
          <SheetTitle>New Client</SheetTitle>
          <SheetDescription>Add a new client to your organization.</SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4 px-4 pb-4"
          noValidate
        >
          <fieldset disabled={isSubmitting} className="contents">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="client-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="client-name"
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
            <Label htmlFor="client-industry">
              Industry <span className="text-destructive">*</span>
            </Label>
            <Select
              id="client-industry"
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
            <Label htmlFor="client-sla">
              SLA Tier <span className="text-destructive">*</span>
            </Label>
            <Select
              id="client-sla"
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
            <Label htmlFor="client-contact">Primary Contact</Label>
            <Input
              id="client-contact"
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
            <Label htmlFor="client-notes">Notes</Label>
            <Textarea
              id="client-notes"
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
            <Button type="submit" disabled={isSubmitting} className="w-full gap-2">
              {isSubmitting && <Loader2Icon className="h-4 w-4 animate-spin" />}
              {isSubmitting ? "Creating…" : "Create Client"}
            </Button>
          </SheetFooter>
          </fieldset>
        </form>
      </SheetContent>
    </Sheet>
  );
}

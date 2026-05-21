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
import { useToast } from "@/components/ui/toast";
import { DeviceForm, DEVICE_FORM_INITIAL, type DeviceFormFields } from "@/components/app/devices/DeviceForm";
import { createDeviceAction } from "@/app/(app)/clients/[id]/actions";

interface AddDeviceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
}

export function AddDeviceDialog({
  open,
  onOpenChange,
  clientId,
}: AddDeviceDialogProps) {
  const { toast } = useToast();
  const [fields, setFields] = React.useState<DeviceFormFields>(DEVICE_FORM_INITIAL);
  const [pending, setPending] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  function onChange<K extends keyof DeviceFormFields>(
    key: K,
    value: DeviceFormFields[K]
  ) {
    setFields((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!fields.hostname.trim()) e.hostname = "Hostname is required";
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
    const result = await createDeviceAction(clientId, {
      ...fields,
      patchAgeDays: fields.patchAgeDays === "" ? 0 : fields.patchAgeDays,
    });
    setPending(false);

    if (result.success) {
      toast({ variant: "success", title: "Device added successfully" });
      setFields(DEVICE_FORM_INITIAL);
      onOpenChange(false);
    } else {
      toast({ variant: "error", title: result.error });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Device</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <DeviceForm fields={fields} errors={errors} onChange={onChange} />
          <DialogFooter showCloseButton className="mt-4">
            <Button type="submit" disabled={pending}>
              {pending ? "Adding…" : "Add Device"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

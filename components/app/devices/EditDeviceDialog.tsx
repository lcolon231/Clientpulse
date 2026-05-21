"use client";

import * as React from "react";

import type { Device } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import {
  DeviceForm,
  type DeviceFormFields,
} from "@/components/app/devices/DeviceForm";
import { updateDeviceAction } from "@/app/(app)/clients/[id]/actions";

interface EditDeviceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  device: Device;
  clientId: string;
}

function deviceToFields(device: Device): DeviceFormFields {
  return {
    hostname: device.hostname,
    type: device.type as DeviceFormFields["type"],
    os: device.os ?? "",
    osVersion: device.osVersion ?? "",
    lastSeen: new Date(device.lastSeen).toISOString().split("T")[0],
    patchAgeDays: device.patchAgeDays,
    tags: device.tags,
  };
}

export function EditDeviceDialog({
  open,
  onOpenChange,
  device,
  clientId,
}: EditDeviceDialogProps) {
  const { toast } = useToast();
  const [fields, setFields] = React.useState<DeviceFormFields>(() =>
    deviceToFields(device)
  );
  const [pending, setPending] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    setFields(deviceToFields(device));
  }, [device]);

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
    const result = await updateDeviceAction(device.id, clientId, {
      ...fields,
      patchAgeDays: fields.patchAgeDays === "" ? 0 : fields.patchAgeDays,
    });
    setPending(false);

    if (result.success) {
      toast({ variant: "success", title: "Device updated successfully" });
      onOpenChange(false);
    } else {
      toast({ variant: "error", title: result.error });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Device</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <DeviceForm fields={fields} errors={errors} onChange={onChange} />
          <DialogFooter showCloseButton className="mt-4">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

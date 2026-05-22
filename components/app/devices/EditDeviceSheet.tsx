"use client";

import * as React from "react";
import { Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { Device } from "@prisma/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  DeviceForm,
  type DeviceFormFields,
} from "@/components/app/devices/DeviceForm";
import { updateDevice } from "@/lib/actions/devices";
import type { DeviceType } from "@/types";

interface EditDeviceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  device: Device;
  clientId: string;
}

function deviceToFields(device: Device): DeviceFormFields {
  return {
    hostname: device.hostname,
    type: device.type as DeviceType,
    os: device.os ?? "",
    osVersion: device.osVersion ?? "",
    lastSeen: new Date(device.lastSeen).toISOString().split("T")[0],
    patchAgeDays: device.patchAgeDays,
    tags: device.tags,
  };
}

export function EditDeviceSheet({
  open,
  onOpenChange,
  device,
  clientId,
}: EditDeviceSheetProps) {
  const router = useRouter();
  const [fields, setFields] = React.useState<DeviceFormFields>(() =>
    deviceToFields(device)
  );
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
    if (fields.hostname.length > 253) e.hostname = "Hostname must be 253 characters or fewer";
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
    const result = await updateDevice(device.id, clientId, {
      ...fields,
      patchAgeDays: fields.patchAgeDays === "" ? 0 : fields.patchAgeDays,
    });
    setPending(false);

    if (result.success) {
      toast.success("Device updated successfully");
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
          <SheetTitle>Edit Device</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4 pb-4" noValidate>
          <fieldset disabled={pending} className="contents">
            <DeviceForm fields={fields} errors={errors} onChange={onChange} />
            <SheetFooter>
              <Button type="submit" disabled={pending} className="w-full gap-2">
                {pending && <Loader2Icon className="h-4 w-4 animate-spin" />}
                {pending ? "Saving…" : "Save Changes"}
              </Button>
            </SheetFooter>
          </fieldset>
        </form>
      </SheetContent>
    </Sheet>
  );
}

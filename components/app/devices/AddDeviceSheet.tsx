"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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
  DEVICE_FORM_INITIAL,
  type DeviceFormFields,
} from "@/components/app/devices/DeviceForm";
import { createDevice } from "@/lib/actions/devices";

interface AddDeviceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
}

export function AddDeviceSheet({
  open,
  onOpenChange,
  clientId,
}: AddDeviceSheetProps) {
  const router = useRouter();
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
    const result = await createDevice(clientId, {
      ...fields,
      patchAgeDays: fields.patchAgeDays === "" ? 0 : fields.patchAgeDays,
    });
    setPending(false);

    if (result.success) {
      toast.success("Device added successfully");
      setFields(DEVICE_FORM_INITIAL);
      onOpenChange(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  // Reset on close
  React.useEffect(() => {
    if (!open) {
      setFields(DEVICE_FORM_INITIAL);
      setErrors({});
    }
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Add Device</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4 pb-4" noValidate>
          <DeviceForm fields={fields} errors={errors} onChange={onChange} />
          <SheetFooter>
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Adding…" : "Add Device"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

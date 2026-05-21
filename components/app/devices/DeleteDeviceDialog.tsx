"use client";

import * as React from "react";

import type { Device } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { deleteDeviceAction } from "@/app/(app)/clients/[id]/actions";

interface DeleteDeviceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  device: Device;
  clientId: string;
}

export function DeleteDeviceDialog({
  open,
  onOpenChange,
  device,
  clientId,
}: DeleteDeviceDialogProps) {
  const { toast } = useToast();
  const [pending, setPending] = React.useState(false);

  async function handleConfirm() {
    setPending(true);
    const result = await deleteDeviceAction(device.id, clientId);
    setPending(false);

    if (result.success) {
      toast({ variant: "success", title: `${device.hostname} deleted` });
      onOpenChange(false);
    } else {
      toast({ variant: "error", title: result.error });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete {device.hostname}?</DialogTitle>
          <DialogDescription>
            This will permanently remove{" "}
            <strong className="font-medium text-foreground">{device.hostname}</strong>{" "}
            from this client. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter showCloseButton>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={pending}
          >
            {pending ? "Deleting…" : "Delete Device"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

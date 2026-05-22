"use client";

import * as React from "react";
import { Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { deleteDevice } from "@/lib/actions/devices";

interface DeleteDeviceAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deviceId: string;
  hostname: string;
  clientId: string;
}

export function DeleteDeviceAlertDialog({
  open,
  onOpenChange,
  deviceId,
  hostname,
  clientId,
}: DeleteDeviceAlertDialogProps) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function handleConfirm() {
    setPending(true);
    const result = await deleteDevice(deviceId, clientId);
    setPending(false);

    if (result.success) {
      toast.success(`${hostname} removed`);
      onOpenChange(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {hostname}?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently remove this device. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel render={<Button variant="outline" />}>
            Cancel
          </AlertDialogCancel>
          <Button variant="destructive" onClick={handleConfirm} disabled={pending} className="gap-2">
            {pending && <Loader2Icon className="h-4 w-4 animate-spin" />}
            {pending ? "Deleting…" : "Delete Device"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

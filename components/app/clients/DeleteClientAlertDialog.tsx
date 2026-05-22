"use client";

import * as React from "react";
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
import { deleteClient } from "@/lib/actions/clients";

interface DeleteClientAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
}

export function DeleteClientAlertDialog({
  open,
  onOpenChange,
  clientId,
  clientName,
}: DeleteClientAlertDialogProps) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function handleConfirm() {
    setPending(true);
    const result = await deleteClient(clientId);
    setPending(false);

    if (result.success) {
      toast.success(`${clientName} deleted`);
      onOpenChange(false);
      router.push("/clients");
    } else {
      toast.error(result.error);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will delete all devices associated with{" "}
            <strong className="font-medium text-foreground">{clientName}</strong>.
            This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel render={<Button variant="outline" />}>
            Cancel
          </AlertDialogCancel>
          <Button variant="destructive" onClick={handleConfirm} disabled={pending}>
            {pending ? "Deleting…" : "Delete Client"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

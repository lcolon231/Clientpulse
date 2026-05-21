"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

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
import { deleteClientAction } from "@/app/(app)/clients/actions";

interface DeleteClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
}

export function DeleteClientDialog({
  open,
  onOpenChange,
  clientId,
  clientName,
}: DeleteClientDialogProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function handleConfirm() {
    setPending(true);
    const result = await deleteClientAction(clientId);
    setPending(false);

    if (result.success) {
      toast({ variant: "success", title: `${clientName} deleted` });
      onOpenChange(false);
      router.push("/clients");
    } else {
      toast({ variant: "error", title: result.error });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete {clientName}?</DialogTitle>
          <DialogDescription>
            This will permanently delete{" "}
            <strong className="font-medium text-foreground">{clientName}</strong>{" "}
            and all their devices. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter showCloseButton>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={pending}
          >
            {pending ? "Deleting…" : "Delete Client"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

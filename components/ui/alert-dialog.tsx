"use client"

import * as React from "react"
import { Dialog as AlertPrimitive } from "@base-ui/react/dialog"

import { cn } from "@/lib/utils"

function AlertDialog({ ...props }: AlertPrimitive.Root.Props) {
  return <AlertPrimitive.Root data-slot="alert-dialog" {...props} />
}

function AlertDialogPortal({ ...props }: AlertPrimitive.Portal.Props) {
  return <AlertPrimitive.Portal data-slot="alert-dialog-portal" {...props} />
}

function AlertDialogOverlay({ className, ...props }: AlertPrimitive.Backdrop.Props) {
  return (
    <AlertPrimitive.Backdrop
      data-slot="alert-dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/50 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

function AlertDialogContent({
  className,
  children,
  ...props
}: AlertPrimitive.Popup.Props) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertPrimitive.Popup
        data-slot="alert-dialog-content"
        className={cn(
          "fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-popover p-4 text-sm text-popover-foreground ring-1 ring-foreground/10 duration-100 outline-none sm:max-w-sm data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          className
        )}
        {...props}
      >
        {children}
      </AlertPrimitive.Popup>
    </AlertDialogPortal>
  )
}

function AlertDialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function AlertDialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn(
        "-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-4 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  )
}

function AlertDialogTitle({ className, ...props }: AlertPrimitive.Title.Props) {
  return (
    <AlertPrimitive.Title
      data-slot="alert-dialog-title"
      className={cn("text-base leading-none font-medium", className)}
      {...props}
    />
  )
}

function AlertDialogDescription({ className, ...props }: AlertPrimitive.Description.Props) {
  return (
    <AlertPrimitive.Description
      data-slot="alert-dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function AlertDialogCancel({ ...props }: AlertPrimitive.Close.Props) {
  return <AlertPrimitive.Close data-slot="alert-dialog-cancel" {...props} />
}

export {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
}

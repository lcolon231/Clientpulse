"use client"

import * as React from "react"
import { XIcon, CheckCircle2Icon, AlertCircleIcon, InfoIcon } from "lucide-react"

import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ToastVariant = "default" | "success" | "error" | "info"

export interface ToastData {
  id: string
  title: string
  description?: string
  variant?: ToastVariant
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface ToastContextValue {
  toast: (data: Omit<ToastData, "id">) => void
}

const ToastContext = React.createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used within <Toaster>")
  return ctx
}

// ---------------------------------------------------------------------------
// Toaster provider + renderer
// ---------------------------------------------------------------------------

export function Toaster({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastData[]>([])

  const toast = React.useCallback((data: Omit<ToastData, "id">) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { ...data, id }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  const dismiss = (id: string) =>
    setToasts((prev) => prev.filter((t) => t.id !== id))

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Viewport */}
      <div
        aria-live="polite"
        aria-label="Notifications"
        className="pointer-events-none fixed bottom-4 right-4 z-[100] flex max-w-sm flex-col gap-2"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} {...t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Individual toast item
// ---------------------------------------------------------------------------

const icons: Record<ToastVariant, React.ReactNode> = {
  default: <InfoIcon className="h-4 w-4 text-muted-foreground" />,
  success: <CheckCircle2Icon className="h-4 w-4 text-green-600" />,
  error: <AlertCircleIcon className="h-4 w-4 text-destructive" />,
  info: <InfoIcon className="h-4 w-4 text-blue-600" />,
}

function ToastItem({
  id,
  title,
  description,
  variant = "default",
  onDismiss,
}: ToastData & { onDismiss: (id: string) => void }) {
  return (
    <div
      className={cn(
        "pointer-events-auto flex w-full items-start gap-3 rounded-xl border bg-popover p-3 shadow-lg ring-1 ring-foreground/5 animate-in slide-in-from-bottom-2 fade-in-0",
        variant === "error" && "border-destructive/20"
      )}
    >
      <span className="mt-0.5 shrink-0">{icons[variant]}</span>
      <div className="flex-1 text-sm">
        <p className="font-medium leading-snug">{title}</p>
        {description && (
          <p className="mt-0.5 text-muted-foreground">{description}</p>
        )}
      </div>
      <button
        onClick={() => onDismiss(id)}
        className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
      >
        <XIcon className="h-3.5 w-3.5" />
        <span className="sr-only">Dismiss</span>
      </button>
    </div>
  )
}

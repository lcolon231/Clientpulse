"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckIcon, Gauge } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  updateOrgNameAction,
  onboardingInviteAction,
  addFirstClientAction,
  completeOnboardingAction,
} from "./actions";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STEPS = [
  { label: "Your Organization" },
  { label: "Invite Team" },
  { label: "First Client" },
  { label: "Done" },
];

const SLA_TIERS = [
  { value: "BASIC", label: "Basic" },
  { value: "STANDARD", label: "Standard" },
  { value: "PREMIUM", label: "Premium" },
  { value: "ENTERPRISE", label: "Enterprise" },
];

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const orgNameSchema = z.object({
  name: z.string().min(1, "Organization name is required").max(80),
});

const inviteSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["TECHNICIAN", "READONLY"]),
});

const clientFormSchema = z.object({
  name: z.string().min(1, "Client name is required").max(80),
  slaTier: z.enum(["BASIC", "STANDARD", "PREMIUM", "ENTERPRISE"]),
});

type OrgNameValues = z.infer<typeof orgNameSchema>;
type InviteValues = z.infer<typeof inviteSchema>;
type ClientFormValues = z.infer<typeof clientFormSchema>;

// ---------------------------------------------------------------------------
// Stepper indicator
// ---------------------------------------------------------------------------

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <React.Fragment key={step.label}>
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors ${
                  done
                    ? "border-primary bg-primary text-primary-foreground"
                    : active
                      ? "border-primary text-primary"
                      : "border-muted text-muted-foreground"
                }`}
              >
                {done ? <CheckIcon className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={`hidden text-xs sm:block ${active ? "font-medium text-foreground" : "text-muted-foreground"}`}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`h-0.5 flex-1 transition-colors ${i < current ? "bg-primary" : "bg-muted"}`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 1 — Org name
// ---------------------------------------------------------------------------

function Step1({ onNext }: { onNext: () => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OrgNameValues>({ resolver: zodResolver(orgNameSchema) });

  async function onSubmit(values: OrgNameValues) {
    const result = await updateOrgNameAction(values.name);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    onNext();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="org-name">Organization name</Label>
        <Input
          id="org-name"
          placeholder="Acme IT Services"
          autoFocus
          {...register("name")}
        />
        {errors.name && (
          <p className="text-destructive text-xs">{errors.name.message}</p>
        )}
      </div>
      <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto self-end">
        {isSubmitting ? "Saving…" : "Continue"}
      </Button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — Invite team
// ---------------------------------------------------------------------------

function Step2({ onNext }: { onNext: () => void }) {
  const [inviteSent, setInviteSent] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { role: "TECHNICIAN" },
  });

  async function onSubmit(values: InviteValues) {
    const result = await onboardingInviteAction(values.email, values.role);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setInviteSent(true);
    reset();
    toast.success(`Invite sent to ${values.email}`);
  }

  return (
    <div className="flex flex-col gap-5">
      {inviteSent && (
        <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-800 dark:bg-green-950/40 dark:text-green-300">
          Invite sent! You can send another or continue.
        </div>
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="invite-email">Email address</Label>
          <Input
            id="invite-email"
            type="email"
            placeholder="technician@yourcompany.com"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-destructive text-xs">{errors.email.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="invite-role">Role</Label>
          <Select id="invite-role" {...register("role")}>
            <option value="TECHNICIAN">Technician</option>
            <option value="READONLY">Read Only</option>
          </Select>
        </div>
        <Button type="submit" variant="outline" disabled={isSubmitting} className="w-full sm:w-auto self-start">
          {isSubmitting ? "Sending…" : "Send Invite"}
        </Button>
      </form>
      <div className="flex justify-between pt-2 border-t">
        <Button variant="ghost" onClick={onNext}>
          Skip for now
        </Button>
        <Button onClick={onNext}>Continue</Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3 — First client
// ---------------------------------------------------------------------------

function Step3({ onNext }: { onNext: () => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: { slaTier: "STANDARD" },
  });

  async function onSubmit(values: ClientFormValues) {
    const result = await addFirstClientAction({
      name: values.name,
      slaTier: values.slaTier,
      industry: "Other",
      primaryContact: "",
      notes: "",
    });
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Client added!");
    onNext();
  }

  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="client-name">Client name</Label>
          <Input
            id="client-name"
            placeholder="Example Corp"
            autoFocus
            {...register("name")}
          />
          {errors.name && (
            <p className="text-destructive text-xs">{errors.name.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="client-sla">SLA tier</Label>
          <Select id="client-sla" {...register("slaTier")}>
            {SLA_TIERS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </div>
        <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto self-end">
          {isSubmitting ? "Adding…" : "Add Client"}
        </Button>
      </form>
      <div className="flex justify-start pt-2 border-t">
        <Button variant="ghost" onClick={onNext}>
          Skip for now
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 4 — Done
// ---------------------------------------------------------------------------

function Step4() {
  const [loading, setLoading] = React.useState(false);

  async function handleFinish() {
    setLoading(true);
    await completeOnboardingAction();
  }

  return (
    <div className="flex flex-col items-center gap-6 py-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <CheckIcon className="h-8 w-8 text-primary" />
      </div>
      <div className="flex flex-col gap-1.5">
        <h2 className="text-xl font-semibold">You&apos;re all set!</h2>
        <p className="text-sm text-muted-foreground">
          Your organization is ready. Head to the dashboard to start monitoring
          your clients.
        </p>
      </div>
      <Button onClick={handleFinish} disabled={loading} size="lg">
        {loading ? "Loading…" : "Go to Dashboard"}
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function OnboardingPage() {
  const [step, setStep] = React.useState(0);

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));

  const stepTitles = [
    "Name your organization",
    "Invite your team",
    "Add your first client",
    "All done!",
  ];

  const stepDescriptions = [
    "Let's get your workspace set up.",
    "Bring your team in — you can always do this later.",
    "Add a client to start tracking health and devices.",
    "Your ClientPulse workspace is ready to go.",
  ];

  return (
    <div className="flex min-h-svh flex-col bg-muted/30">
      {/* Header */}
      <header className="flex h-14 items-center gap-2 border-b bg-background px-6">
        <Gauge className="text-primary h-5 w-5" />
        <span className="font-semibold tracking-tight">ClientPulse</span>
      </header>

      {/* Content */}
      <main className="flex flex-1 items-start justify-center px-4 py-12">
        <div className="w-full max-w-lg flex flex-col gap-8">
          <StepIndicator current={step} />

          <Card>
            <CardHeader>
              <CardTitle>{stepTitles[step]}</CardTitle>
              <CardDescription>{stepDescriptions[step]}</CardDescription>
            </CardHeader>
            <CardContent>
              {step === 0 && <Step1 onNext={next} />}
              {step === 1 && <Step2 onNext={next} />}
              {step === 2 && <Step3 onNext={next} />}
              {step === 3 && <Step4 />}
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground">
            Step {step + 1} of {STEPS.length}
          </p>
        </div>
      </main>
    </div>
  );
}

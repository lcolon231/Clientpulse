import type { Metadata } from "next";
import Link from "next/link";
import {
  HeartPulseIcon,
  FileTextIcon,
  BellIcon,
  MonitorIcon,
  UploadIcon,
  ShieldCheckIcon,
  GaugeIcon,
  CheckIcon,
} from "lucide-react";

export const metadata: Metadata = {
  title: "ClientPulse — MSP Dashboard",
  description:
    "Monitor client health, automate reports, and never miss a critical alert.",
  openGraph: {
    title: "ClientPulse — MSP Dashboard",
    description:
      "Monitor client health, automate reports, and never miss a critical alert.",
  },
};

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const FEATURES = [
  {
    icon: HeartPulseIcon,
    title: "Client Health Scoring",
    description:
      "Real-time health scores for every client based on patch age and device coverage.",
  },
  {
    icon: FileTextIcon,
    title: "Automated PDF Reports",
    description:
      "Monthly health reports generated and emailed to you automatically. No manual work.",
  },
  {
    icon: BellIcon,
    title: "Threshold Alerts",
    description:
      "Get notified the moment a client drops to CRITICAL or a device falls behind on patches.",
  },
  {
    icon: MonitorIcon,
    title: "Device Management",
    description:
      "Track every endpoint — hostname, OS, patch age, tags, and last-seen timestamp.",
  },
  {
    icon: UploadIcon,
    title: "CSV Import",
    description:
      "Bulk-import devices from any RMM export. Rows validated, limits enforced, warnings returned.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Multi-Tenant & Role-Based Access",
    description:
      "Each MSP sees only their own data. Roles: Owner, Technician, Read Only — enforced server-side.",
  },
];

const PLANS = [
  {
    name: "Starter",
    price: "$29",
    description: "Perfect for small MSPs getting started.",
    features: [
      "Up to 10 clients",
      "Up to 50 devices",
      "Health scoring & alerts",
      "Audit log",
      "PDF report download",
    ],
    highlighted: false,
    badge: null,
  },
  {
    name: "Growth",
    price: "$79",
    description: "For growing MSPs managing more clients.",
    features: [
      "Up to 50 clients",
      "Up to 500 devices",
      "CSV device import",
      "Scheduled email reports",
      "Everything in Starter",
    ],
    highlighted: true,
    badge: "Most Popular",
  },
  {
    name: "Enterprise",
    price: "$199",
    description: "Unlimited scale for large operations.",
    features: [
      "Unlimited clients",
      "Unlimited devices",
      "CSV device import",
      "Scheduled email reports",
      "Priority support",
      "Everything in Growth",
    ],
    highlighted: false,
    badge: null,
  },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function LandingPage() {
  return (
    <div className="min-h-svh bg-white text-gray-900 antialiased">
      {/* ------------------------------------------------------------------ */}
      {/* Nav                                                                  */}
      {/* ------------------------------------------------------------------ */}
      <header className="sticky top-0 z-40 bg-gray-950 text-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <GaugeIcon className="h-5 w-5 text-indigo-400" />
            <span className="font-semibold tracking-tight">ClientPulse</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-gray-300 hover:text-white transition-colors"
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="rounded-md bg-indigo-500 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-indigo-400 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* Hero                                                                 */}
      {/* ------------------------------------------------------------------ */}
      <section className="bg-gray-950 text-white pb-24 pt-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            The MSP Dashboard That{" "}
            <span className="text-indigo-400">Keeps You Ahead.</span>
          </h1>
          <p className="mt-6 text-lg text-gray-300 sm:text-xl">
            Monitor client health, automate reports, and never miss a critical
            alert — all in one place.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/signup"
              className="w-full rounded-lg bg-indigo-500 px-6 py-3 text-base font-semibold text-white shadow hover:bg-indigo-400 transition-colors sm:w-auto"
            >
              Start Free Trial
            </Link>
            <a
              href="#features"
              className="w-full rounded-lg border border-gray-600 px-6 py-3 text-base font-semibold text-gray-200 hover:border-gray-400 hover:text-white transition-colors sm:w-auto"
            >
              See How It Works
            </a>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Features                                                             */}
      {/* ------------------------------------------------------------------ */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold tracking-tight">
              Everything your MSP needs
            </h2>
            <p className="mt-3 text-gray-500 text-lg">
              Purpose-built for MSPs — no bloat, no per-seat surprises.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-xl border bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
                  <Icon className="h-5 w-5 text-indigo-600" />
                </div>
                <h3 className="font-semibold text-gray-900">{title}</h3>
                <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Pricing                                                              */}
      {/* ------------------------------------------------------------------ */}
      <section id="pricing" className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold tracking-tight">
              Simple, transparent pricing
            </h2>
            <p className="mt-3 text-gray-500 text-lg">
              Start free. Scale when you&apos;re ready.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-2xl border p-7 ${
                  plan.highlighted
                    ? "border-indigo-500 ring-2 ring-indigo-500 shadow-lg"
                    : "border-gray-200 shadow-sm"
                }`}
              >
                {plan.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-500 px-3 py-0.5 text-xs font-semibold text-white">
                    {plan.badge}
                  </span>
                )}
                <div className="mb-5">
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  <div className="mt-2 flex items-end gap-1">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-gray-400 mb-1">/mo</span>
                  </div>
                  <p className="mt-1.5 text-sm text-gray-500">{plan.description}</p>
                </div>
                <ul className="mb-7 flex flex-col gap-2.5 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                      <CheckIcon className="h-4 w-4 shrink-0 mt-0.5 text-indigo-500" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className={`block rounded-lg px-4 py-2.5 text-center text-sm font-semibold transition-colors ${
                    plan.highlighted
                      ? "bg-indigo-500 text-white hover:bg-indigo-400"
                      : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* CTA banner                                                           */}
      {/* ------------------------------------------------------------------ */}
      <section className="bg-indigo-600 py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold text-white">
            Ready to take control of your MSP?
          </h2>
          <p className="mt-3 text-indigo-100 text-lg">
            Join MSPs already using ClientPulse to stay ahead of client health.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-block rounded-lg bg-white px-8 py-3 text-base font-semibold text-indigo-600 shadow hover:bg-indigo-50 transition-colors"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Footer                                                               */}
      {/* ------------------------------------------------------------------ */}
      <footer className="border-t bg-gray-950 text-gray-400 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 text-sm sm:flex-row sm:justify-between sm:px-6">
          <div className="flex items-center gap-2">
            <GaugeIcon className="h-4 w-4 text-indigo-400" />
            <span className="font-medium text-white">ClientPulse</span>
            <span>· © {new Date().getFullYear()} NodeLink Technologies</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-white transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Terms of Service
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import {
  GitFork,
  ExternalLink,
  Clock,
  CheckCircle,
  AlertTriangle,
  Wrench,
} from "lucide-react";

export const metadata: Metadata = {
  title: "ClientPulse — Case Study",
  description:
    "How I built a multi-tenant MSP health dashboard with Next.js 14, Supabase RLS, Prisma, Stripe, and Vercel — architecture decisions, things that broke, and what I'd do differently.",
};

// ---------------------------------------------------------------------------
// Shared layout primitives (no AppShell — this page is fully standalone)
// ---------------------------------------------------------------------------

function Section({
  id,
  children,
  className = "",
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`py-16 ${className}`}>
      <div className="mx-auto max-w-3xl px-6">{children}</div>
    </section>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-6 text-2xl font-bold tracking-tight text-gray-900">
      {children}
    </h2>
  );
}

function Prose({ children }: { children: React.ReactNode }) {
  return <div className="space-y-4 text-base leading-relaxed text-gray-700">{children}</div>;
}

function CodeBlock({ children, lang = "sql" }: { children: string; lang?: string }) {
  return (
    <div className="my-6 overflow-x-auto rounded-xl border border-gray-200 bg-gray-950">
      <div className="flex items-center gap-2 border-b border-gray-800 px-4 py-2">
        <span className="font-mono text-xs text-gray-500">{lang}</span>
      </div>
      <pre className="p-4 text-sm leading-relaxed text-gray-100">
        <code>{children}</code>
      </pre>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

const rlsPolicySql = `-- How the JWT claim works:
-- Every Supabase JWT carries a custom org_id claim injected by
-- custom_access_token_hook. RLS policies read it with auth.jwt().

CREATE OR REPLACE FUNCTION public.requesting_org_id()
RETURNS text AS $$
  SELECT auth.jwt() ->> 'org_id';
$$ LANGUAGE sql STABLE;

-- SELECT: only rows whose organization_id matches the JWT claim.
-- Postgres evaluates USING for every candidate row. A false result
-- silently filters the row — the caller sees zero rows, not a 403.
CREATE POLICY "clients: org members can read their own clients"
  ON public.clients
  FOR SELECT
  TO authenticated
  USING (
    organization_id::text = public.requesting_org_id()
  );

-- INSERT: WITH CHECK validates the NEW row before it is written.
CREATE POLICY "clients: org members can insert their own clients"
  ON public.clients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id::text = public.requesting_org_id()
  );

-- UPDATE: USING filters which rows can be targeted;
-- WITH CHECK prevents re-assigning a row to a different org.
CREATE POLICY "clients: org members can update their own clients"
  ON public.clients
  FOR UPDATE
  TO authenticated
  USING (organization_id::text = public.requesting_org_id())
  WITH CHECK (organization_id::text = public.requesting_org_id());`;

const healthScoreTs = `// lib/health/calculate-client-health.ts
// Score 0–100 derived from the patch age distribution of a client's devices.

export function scoreClient(devices: { patchAgeDays: number }[]): number {
  if (devices.length === 0) return 0;

  // Weight each device: fresh = 100pts, stale = 0pts, linear in between.
  const MAX_PATCH_AGE = 90; // days — anything older is treated as 0
  const score =
    devices.reduce((sum, d) => {
      const raw = Math.max(0, MAX_PATCH_AGE - d.patchAgeDays);
      return sum + (raw / MAX_PATCH_AGE) * 100;
    }, 0) / devices.length;

  return Math.round(score);
}

// Band thresholds used consistently across badges, charts, and alerts:
//   >= 80 → Healthy (green)
//   >= 60 → Needs Attention (yellow)
//    < 60 → Critical (red)

export async function getOrgHealth(
  organizationId: string,
): Promise<Map<string, ClientHealth>> {
  const clients = await prisma.client.findMany({
    where: { organizationId },
    select: { id: true, devices: { select: { patchAgeDays: true } } },
  });

  return new Map(
    clients.map((c) => {
      const score = scoreClient(c.devices);
      return [c.id, { score, band: scoreToBand(score) }];
    }),
  );
}`;

const prismaAdapterTs = `// lib/db/prisma.ts — singleton with Hot Module Replacement guard
// Why this matters: Next.js HMR re-executes modules on every file save.
// Without the globalThis guard, each save opens a new pg.Pool until
// Postgres hits its connection limit (usually 100).

function makePrismaClient() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development"
      ? ["query", "warn", "error"]
      : ["error"],
  });
}

const globalForPrisma = globalThis as { prisma?: PrismaClientSingleton };

export const prisma = globalForPrisma.prisma ?? makePrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma; // reuse across HMR cycles
}`;

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CaseStudyPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 antialiased">
      {/* ===== NAV ===== */}
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex h-13 max-w-3xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900">
            <Clock className="h-4 w-4 text-indigo-500" />
            ClientPulse
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="https://clientpulse.vercel.app"
              className="text-sm text-gray-500 hover:text-gray-900"
              target="_blank"
              rel="noopener noreferrer"
            >
              Live demo
            </Link>
            <Link
              href="https://github.com/lcolon231/Clientpulse"
              className="text-sm text-gray-500 hover:text-gray-900"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </Link>
          </div>
        </div>
      </header>

      {/* ===== HERO ===== */}
      <section id="hero" className="border-b border-gray-100 bg-gray-50 py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <span className="inline-block rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
            Portfolio case study
          </span>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            ClientPulse
          </h1>
          <p className="mt-4 text-xl text-gray-600">
            A multi-tenant MSP health dashboard built with Next.js 14, Supabase RLS,
            Prisma, Stripe, and Vercel.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="https://clientpulse.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
            >
              <ExternalLink className="h-4 w-4" />
              Live demo
            </Link>
            <Link
              href="https://github.com/lcolon231/Clientpulse"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            >
              <GitFork className="h-4 w-4" />
              View on GitHub
            </Link>
          </div>
        </div>
      </section>

      {/* ===== THE PROBLEM ===== */}
      <Section id="the-problem">
        <H2>The Problem</H2>
        <Prose>
          <p>
            Managed Service Providers are the IT departments for hundreds of small businesses.
            A typical MSP technician is responsible for 30–80 client organisations simultaneously —
            monitoring whether their workstations are patched, their servers are healthy, and their
            SLA commitments are being met. It is a job defined by context-switching and alert fatigue.
          </p>
          <p>
            The dominant platforms in this space — ConnectWise, Kaseya, Autotask — are enterprise
            tools with enterprise price tags. They are powerful, deeply integrated, and wildly
            over-engineered for a 5-person MSP managing local dental offices and law firms. A basic
            ConnectWise seat runs $150–200/month per technician. Onboarding takes weeks. The UI
            assumes your MSP has a dedicated project manager.
          </p>
          <p>
            Smaller MSPs use spreadsheets, Notion, or informal Slack channels to track client health.
            They miss patches. They find out a client is critical when the client calls them, not
            before. I built ClientPulse to give these teams the minimum viable dashboard that answers
            the three questions they ask every morning: who is healthy, who is struggling, and what
            needs my attention right now.
          </p>
        </Prose>
      </Section>

      {/* ===== GOALS & CONSTRAINTS ===== */}
      <Section id="goals" className="bg-gray-50">
        <H2>Goals &amp; Constraints</H2>
        <Prose>
          <p>
            <strong>The MVP had to:</strong>
          </p>
          <ul className="ml-4 list-disc space-y-1">
            <li>Let an MSP create an account and start adding clients in under 5 minutes</li>
            <li>Show a per-client health score derived from real device data</li>
            <li>Alert on CRITICAL health without spamming the inbox</li>
            <li>Be completely multi-tenant — one MSP must never see another&apos;s data</li>
            <li>Have a billing gate so the project could theoretically be a real product</li>
            <li>Be deployed and publicly accessible, not just running on localhost</li>
          </ul>
          <p className="pt-2">
            <strong>It explicitly did not try to:</strong>
          </p>
          <ul className="ml-4 list-disc space-y-1">
            <li>Integrate with real RMM tools (ConnectWise, Kaseya) — data is entered manually or via CSV</li>
            <li>Handle backup status, ticket queues, or billing reconciliation</li>
            <li>Build a mobile app or native notifications</li>
            <li>Support SAML/SSO or enterprise identity providers</li>
          </ul>
          <p className="pt-2">
            <strong>Time budget:</strong> 9 weeks of focused evening and weekend work (~4–6 hours/week),
            building one milestone per week from schema to production readiness.
          </p>
        </Prose>
      </Section>

      {/* ===== ARCHITECTURE ===== */}
      <Section id="architecture">
        <H2>Architecture</H2>
        <Prose>
          <p>
            The data model is a strict hierarchy rooted at <strong>Organization</strong> — the MSP tenant.
            Every record in the system belongs to exactly one Organisation:
          </p>
        </Prose>
        <CodeBlock lang="text">{`Organization
  └─ User[]         (OWNER | TECHNICIAN | READONLY)
  └─ Client[]       (the MSP's small-business customers)
       └─ Device[]  (endpoints: workstations, servers, etc.)
  └─ AuditLog[]     (immutable append-only mutation history)`}</CodeBlock>
        <Prose>
          <p>
            <strong>Multi-tenancy via Row-Level Security:</strong> Rather than adding a{" "}
            <code className="rounded bg-gray-100 px-1 font-mono text-sm">WHERE organizationId = $1</code>{" "}
            clause to every Prisma query, the database enforces tenant isolation at the row level.
            Every JWT minted by Supabase Auth carries a custom <code className="rounded bg-gray-100 px-1 font-mono text-sm">org_id</code>{" "}
            claim, injected by a Postgres function wired as a Supabase Auth Hook.
            RLS policies on each table compare this claim against the row&apos;s{" "}
            <code className="rounded bg-gray-100 px-1 font-mono text-sm">organization_id</code> column.
            A query that accidentally omits a tenant filter returns zero rows — it does not leak data.
          </p>
        </Prose>
        <CodeBlock lang="sql">{rlsPolicySql}</CodeBlock>
        <Prose>
          <p>
            <strong>Health score algorithm:</strong> Each device contributes a score from 0–100 based
            on how many days since its last patch. Devices patched within 30 days score near 100;
            devices with 90+ days of patch age score 0. The client score is the arithmetic mean
            across all its devices. Clients are bucketed into three bands: Healthy (≥80),
            Needs Attention (60–79), Critical (&lt;60). The same thresholds drive the dashboard
            colour coding, the badge variants, and the alert trigger logic.
          </p>
        </Prose>
      </Section>

      {/* ===== KEY TECHNICAL DECISIONS ===== */}
      <Section id="decisions" className="bg-gray-50">
        <H2>Key Technical Decisions</H2>
        <div className="space-y-4">
          {[
            {
              choice: "Supabase Auth",
              why: "PKCE flow, invite-by-email, and password reset all work correctly out of the box. Getting PKCE right from scratch — keeping the code_verifier in the browser's cookie jar through the callback redirect — is a surprisingly easy place to introduce a security bug.",
              tradeoff: "Migrating off Supabase Auth at scale is painful. The JWT format is Supabase-specific. I'd evaluate Auth0 or Clerk for an enterprise version.",
            },
            {
              choice: "Prisma 7 (driver adapter mode)",
              why: "TypeScript-first schema. The driver adapter pattern (PrismaPg wrapping a pg.Pool) works correctly with Supabase's pgBouncer at port 6543, which rejects the binary protocol used by Prisma's built-in engine.",
              tradeoff: "Prisma adds ~10ms overhead per query compared to raw pg. For the hot paths (dashboard health map, client list), I'd profile and move to $queryRaw or Drizzle.",
            },
            {
              choice: "@react-pdf/renderer",
              why: "Server-side PDF generation in a React component model. No Puppeteer, no headless Chrome, no Lambda cold-start cost. The PDF runs inside a Next.js Server Action.",
              tradeoff: "react-pdf blocks the Node.js thread (~200ms per document). For large orgs, the monthly cron would time out. Fix: queue PDF jobs with Inngest or BullMQ.",
            },
            {
              choice: "Resend for email",
              why: "Clean REST API, React Email templates, and a generous free tier that covers the alert volume for a startup-phase MSP tool.",
              tradeoff: "Single vendor. At scale, add a fallback (SES) and an outbox pattern (write the email to a DB table, send from a worker) so failures are retryable.",
            },
            {
              choice: "Upstash Redis for rate limiting",
              why: "Serverless-native Redis with a REST API. Works in Next.js API routes and Server Actions. The sliding window algorithm is fairest for auth endpoints. Fail-open design keeps the app available if Redis is unreachable.",
              tradeoff: "Per-IP limits are bypassable with IPv6 rotation. A production hardening pass would add user-ID-based limits for authenticated routes.",
            },
          ].map((card) => (
            <div
              key={card.choice}
              className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <h3 className="text-base font-semibold text-gray-900">{card.choice}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-700">
                <strong>Why:</strong> {card.why}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-gray-500">
                <strong>At scale:</strong> {card.tradeoff}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* ===== THREE THINGS I'M PROUD OF ===== */}
      <Section id="proud-of">
        <H2>Three Things I&apos;m Proud Of</H2>

        <div className="space-y-10">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <h3 className="text-base font-semibold">1. The RLS Policy Design</h3>
            </div>
            <p className="mb-4 text-sm leading-relaxed text-gray-700">
              Most tutorials implement multi-tenancy with a WHERE clause in the application layer.
              That approach has a category of bug: if you forget the clause, you leak data. The RLS
              approach shifts the responsibility to the database. The policy above runs for every
              query — including ones issued directly from psql or a BI tool. There is no code path
              that bypasses it. The <code className="rounded bg-gray-100 px-1 font-mono text-sm">requesting_org_id()</code> helper
              and the custom JWT hook are the two moving parts that make this possible.
            </p>
            <CodeBlock lang="sql">{rlsPolicySql}</CodeBlock>
          </div>

          <div>
            <div className="mb-3 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <h3 className="text-base font-semibold">2. The Health Score Query</h3>
            </div>
            <p className="mb-4 text-sm leading-relaxed text-gray-700">
              The scoring function is pure arithmetic with no external dependencies — deterministic,
              testable, and fast. The org-level health map fetches all clients and their devices in
              one query and builds the Map in memory, avoiding N+1. The same score drives every
              surface in the UI: badges, chart colours, alert triggers.
            </p>
            <CodeBlock lang="typescript">{healthScoreTs}</CodeBlock>
          </div>

          <div>
            <div className="mb-3 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <h3 className="text-base font-semibold">3. The Prisma Singleton Pattern</h3>
            </div>
            <p className="mb-4 text-sm leading-relaxed text-gray-700">
              Next.js HMR re-runs module-level code on every file save. A naive{" "}
              <code className="rounded bg-gray-100 px-1 font-mono text-sm">new PrismaClient()</code>{" "}
              at the module level exhausts Postgres&apos;s connection limit within minutes in development.
              The globalThis guard below is the idiomatic fix — and a genuine gotcha that most developers
              discover the hard way.
            </p>
            <CodeBlock lang="typescript">{prismaAdapterTs}</CodeBlock>
          </div>
        </div>
      </Section>

      {/* ===== THINGS THAT BROKE ===== */}
      <Section id="things-that-broke" className="bg-gray-50">
        <H2>Things That Broke</H2>
        <div className="space-y-8">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
            <div className="mb-2 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <h3 className="text-base font-semibold text-amber-900">
                1. Prisma bundled into the browser and broke the Vercel build
              </h3>
            </div>
            <p className="text-sm leading-relaxed text-amber-800">
              <strong>What happened:</strong> I defined a <code className="rounded bg-amber-100 px-1 font-mono text-xs">SlaTier</code> type
              in <code className="rounded bg-amber-100 px-1 font-mono text-xs">types/client.ts</code> by importing it from{" "}
              <code className="rounded bg-amber-100 px-1 font-mono text-xs">@prisma/client</code>. That file was imported by a
              Client Component. Turbopack tried to bundle Prisma into the browser bundle, hit a
              Node.js module (<code className="rounded bg-amber-100 px-1 font-mono text-xs">.prisma/client/index-browser</code>),
              and the Vercel build failed with a cryptic &quot;Module not found&quot; error.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-amber-800">
              <strong>Fix:</strong> Replace the Prisma import with a locally-defined const array:{" "}
              <code className="rounded bg-amber-100 px-1 font-mono text-xs">export const SLA_TIER_OPTIONS = [&quot;BASIC&quot;, &quot;STANDARD&quot;, ...] as const</code>.
              Use <code className="rounded bg-amber-100 px-1 font-mono text-xs">import type</code>{" "}
              — never a runtime import — for any Prisma type that a Client Component needs.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-amber-800">
              <strong>Lesson:</strong> The Next.js client/server boundary is a real bundler boundary, not just
              a lint convention. Any module imported (transitively) by a <code className="rounded bg-amber-100 px-1 font-mono text-xs">&quot;use client&quot;</code> file
              gets bundled for the browser. Node.js-only modules will fail at build time, not
              at runtime, so the error shows up in CI rather than locally if you&apos;re not running
              <code className="rounded bg-amber-100 px-1 font-mono text-xs">next build</code> locally.
            </p>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
            <div className="mb-2 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <h3 className="text-base font-semibold text-amber-900">
                2. The middleware blocked sitemap.xml and robots.txt
              </h3>
            </div>
            <p className="text-sm leading-relaxed text-amber-800">
              <strong>What happened:</strong> The Next.js middleware (which guards authenticated routes)
              used a negative-lookahead matcher that ran on essentially every path, including
              <code className="rounded bg-amber-100 px-1 font-mono text-xs">/sitemap.xml</code> and{" "}
              <code className="rounded bg-amber-100 px-1 font-mono text-xs">/robots.txt</code>. Since
              unauthenticated requests to non-public paths are redirected to <code className="rounded bg-amber-100 px-1 font-mono text-xs">/login</code>,
              search engine crawlers were seeing a 302 instead of the sitemap XML.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-amber-800">
              <strong>Fix:</strong> Replaced the catch-all matcher with a positive match of known
              routes. The matcher now only runs on <code className="rounded bg-amber-100 px-1 font-mono text-xs">/(dashboard|clients|...)</code>{" "}
              and auth pages. Unknown paths and SEO files bypass the middleware entirely and go
              straight to the Next.js router.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-amber-800">
              <strong>Lesson:</strong> The &quot;run on everything, whitelist public paths&quot; middleware pattern
              is convenient but fragile. The &quot;run only on known protected paths&quot; pattern is safer:
              new unrelated routes (like SEO files) don&apos;t accidentally break, and the security
              boundary is explicit in the matcher config.
            </p>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
            <div className="mb-2 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <h3 className="text-base font-semibold text-amber-900">
                3. Zod v4 changed the error API and broke all server actions silently
              </h3>
            </div>
            <p className="text-sm leading-relaxed text-amber-800">
              <strong>What happened:</strong> Upgraded to Zod v4. All server actions that returned validation
              errors silently stopped returning messages. The forms showed blank error states. The
              breakage was <code className="rounded bg-amber-100 px-1 font-mono text-xs">parsed.error.errors[0]?.message</code> — Zod v4 renamed{" "}
              <code className="rounded bg-amber-100 px-1 font-mono text-xs">.errors</code> to{" "}
              <code className="rounded bg-amber-100 px-1 font-mono text-xs">.issues</code>. The TypeScript types were updated
              but the old property was not removed and did not throw — it returned{" "}
              <code className="rounded bg-amber-100 px-1 font-mono text-xs">undefined</code> silently.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-amber-800">
              <strong>Fix:</strong> Replaced all{" "}
              <code className="rounded bg-amber-100 px-1 font-mono text-xs">parsed.error.errors</code> with{" "}
              <code className="rounded bg-amber-100 px-1 font-mono text-xs">parsed.error.issues</code> across
              every server action.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-amber-800">
              <strong>Lesson:</strong> Major version bumps of validation libraries are testing traps: the
              types change before the runtime behaviour fails loudly. Adding integration tests that
              submit invalid data to forms and assert on the error message text would have caught
              this immediately.
            </p>
          </div>
        </div>
      </Section>

      {/* ===== RESULTS ===== */}
      <Section id="results">
        <H2>Results</H2>
        <Prose>
          <p>
            The project is deployed to Vercel and publicly accessible. Here are the objective measures:
          </p>
        </Prose>

        <div className="mt-6">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Lighthouse Scores (production)
          </h3>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Route</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-700">Perf</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-700">A11y</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-700">Best Practices</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-700">SEO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  { route: "/", perf: 95, a11y: 92, bp: 95, seo: 100 },
                  { route: "/login", perf: 98, a11y: 91, bp: 95, seo: 90 },
                  { route: "/dashboard", perf: 82, a11y: 88, bp: 92, seo: 78 },
                ].map((row) => (
                  <tr key={row.route} className="bg-white">
                    <td className="px-4 py-3 font-mono text-sm text-gray-700">{row.route}</td>
                    {[row.perf, row.a11y, row.bp, row.seo].map((score, i) => (
                      <td key={i} className="px-4 py-3 text-center">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                            score >= 90
                              ? "bg-green-100 text-green-800"
                              : score >= 70
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                          }`}
                        >
                          {score}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Dashboard SEO score is low by design — /dashboard is disallowed in robots.txt and carries
            no public meta tags. Performance reflects Recharts bundle weight; dynamic import() would
            push it above 90.
          </p>
        </div>

        <div className="mt-8">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Features Shipped
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              "Multi-tenant auth with RLS",
              "Invite + role system",
              "Client & device CRUD",
              "CSV bulk import",
              "Health score engine",
              "Recharts dashboard",
              "Monthly PDF reports",
              "Resend email delivery",
              "Stripe billing (3 plans)",
              "In-app notifications",
              "4-step onboarding wizard",
              "Settings (Profile, Team, Billing)",
              "Upstash rate limiting",
              "Pino structured logging",
              "CI/CD (3 parallel jobs)",
              "Public marketing site + SEO",
            ].map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm text-gray-700">
                <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
                {f}
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ===== WHAT'S NEXT ===== */}
      <Section id="whats-next" className="bg-gray-50">
        <H2>What&apos;s Next</H2>
        <Prose>
          <p>
            The project is at an MVP state. Here&apos;s what I&apos;d build next and a rough cost estimate for each:
          </p>
        </Prose>
        <div className="mt-6 space-y-4">
          {[
            {
              title: "ConnectWise / Autotask integration",
              desc: "Read-only ticket feed from the MSP's PSA. Surface open ticket count per client. This is the highest-value addition — it's the primary reason MSPs pay for existing tools.",
              effort: "2–3 weeks per platform. Each PSA has its own OAuth flow and data model.",
            },
            {
              title: "AI-generated report summaries",
              desc: "Call the Anthropic API with the client's health metrics and generate a plain-English paragraph for the monthly PDF. The prompt is straightforward; the hard part is making it reliably useful rather than generic.",
              effort: "3–4 days. Mostly prompt engineering and PDF layout work.",
            },
            {
              title: "Role management UI",
              desc: "Owners can currently set roles at invite time but can't change them afterward without direct DB access. A settings tab to promote/demote users is a one-sprint item that would remove a meaningful pain point.",
              effort: "3–5 days.",
            },
            {
              title: "Backup status aggregation",
              desc: "Pull job status from Veeam, Acronis, or Datto APIs. Surface pass/fail/warning per client alongside device health. Adds a second dimension to the health score.",
              effort: "2–4 weeks per integration, mostly credential management and API mapping.",
            },
            {
              title: "Mobile push notifications",
              desc: "A React Native (Expo) companion app that sends CRITICAL alerts as push notifications. Technicians shouldn't need to check a dashboard to know something is wrong.",
              effort: "4–6 weeks for a functional iOS/Android app.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{item.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-gray-600">{item.desc}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    <strong>Effort:</strong> {item.effort}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ===== FOOTER ===== */}
      <footer id="footer" className="border-t border-gray-100 bg-white py-12">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <p className="text-base font-medium text-gray-900">Luis Colón</p>
          <p className="mt-1 text-sm text-gray-500">
            Full-stack developer — Next.js, TypeScript, Supabase
          </p>
          <div className="mt-4 flex items-center justify-center gap-6 text-sm text-gray-500">
            <a
              href="https://github.com/lcolon231"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-gray-900"
            >
              <GitFork className="h-4 w-4" />
              github.com/lcolon231
            </a>
            <a
              href="https://linkedin.com/in/lcolon231"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-900"
            >
              LinkedIn
            </a>
            <a
              href="mailto:luis.acolon03@gmail.com"
              className="hover:text-gray-900"
            >
              luis.acolon03@gmail.com
            </a>
          </div>
          <p className="mt-6 text-xs text-gray-400">
            © {new Date().getFullYear()} · Built with Next.js, Supabase, and too much coffee
          </p>
        </div>
      </footer>
    </div>
  );
}

# ClientPulse

**Multi-tenant MSP client health dashboard** — monitor device patch status, SLA compliance, and client health scores from a single pane of glass.

**[Live Demo](https://clientpulse.vercel.app)** · [Case Study](https://clientpulse.vercel.app/case-study)

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Auth-3ECF8E?logo=supabase)
![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma)
![Tailwind](https://img.shields.io/badge/Tailwind-4-38BDF8?logo=tailwindcss)
![Stripe](https://img.shields.io/badge/Stripe-Billing-635BFF?logo=stripe)
![Vercel](https://img.shields.io/badge/Vercel-Deploy-000000?logo=vercel)

---

## What is ClientPulse?

Managed Service Providers manage dozens of small-business clients simultaneously — keeping their workstations patched, their servers healthy, and their SLA agreements met. The existing tools (ConnectWise, Kaseya, Autotask) cost thousands of dollars per month and take weeks to onboard. Smaller MSPs pay for functionality they'll never use while drowning in dashboards that weren't designed with them in mind.

ClientPulse is a focused, purpose-built alternative. It gives an MSP technician a single screen that answers the three questions they ask every morning: which clients are healthy, which devices are falling behind on patches, and which SLA tiers are at risk. Health scores are calculated automatically from device patch age data and surfaced in real-time on the dashboard. When a client drops to CRITICAL, an alert email goes out — once, with a 7-day dedup window so you're not flooded.

The architecture prioritises correctness of the multi-tenancy boundary above everything else. Each MSP organisation is completely isolated at the Postgres row level — no application-level WHERE clause required, no risk of accidentally leaking a client's data to another tenant. Row-Level Security policies enforced by the database are the only reliable tenant boundary; this project demonstrates how to implement that correctly with Supabase Auth, a custom JWT hook, and Prisma as the ORM.

---

## Features

### Auth & Multi-tenancy
- Email/password sign-up creates an Organisation + Owner atomically
- Invite-by-email flow for adding Technicians and Read-Only users
- Password reset via PKCE — code verifier stays in the browser, never touches the server
- Row-Level Security on all tables — the database enforces tenant isolation, not application code
- Custom Access Token Hook injects `org_id` into every JWT, enabling RLS without extra round-trips
- Three roles: **OWNER** (full access), **TECHNICIAN** (read + write), **READ_ONLY** (read only)

### Client & Device Management
- Searchable, filterable client list with SLA tier badges and health scores
- Client detail page with tabs: Overview, Devices, Tickets (placeholder), Reports
- Full device CRUD: hostname, type, OS, OS version, patch age, last seen, tags
- CSV import with client-side validation — invalid rows highlighted before submit
- Tag system with colour-coded badges (Server, Workstation, Laptop, Network, Firewall, NAS)
- Immutable audit log on every mutation (7 action types, JSON metadata)

### Health Scoring
- Score 0–100 calculated from patch age distribution across a client's devices
- Three bands: **Healthy** (80–100), **Needs Attention** (60–79), **Critical** (<60)
- Org-level health map used in dashboard client cards and client list badges
- Recharts visualisations: health distribution donut, patch age bar chart, SLA distribution

### Reporting
- Monthly PDF health reports via `@react-pdf/renderer`
- Scheduled email delivery via Resend (Vercel Cron, 1st of each month)
- Download Report button on client detail page (role-gated, OWNER + TECHNICIAN)

### Billing
- Three plans: **STARTER** ($29/mo), **GROWTH** ($79/mo), **ENTERPRISE** ($199/mo)
- Stripe Checkout for new subscriptions, Stripe Customer Portal for management
- Webhook handler processes `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- Plan limits enforced in server actions and cron (client/device count caps)

### Notifications & Alerts
- In-app notification bell with unread count badge
- Threshold alerts: CRITICAL health and stale patch age trigger one email per 7 days
- Alert dedup tracked via AuditLog — no duplicate floods

### Infrastructure
- Rate limiting via Upstash Redis (sliding window, 10 req/10s) on auth and mutation routes
- Structured logging with Pino (pino-pretty in dev, JSON in prod)
- Global and route-level error boundaries with styled "Try again" reset
- `app/sitemap.ts` and `app/robots.ts` for SEO
- CI/CD: three parallel GitHub Actions jobs (typecheck, lint, build) on every PR
- 4-step onboarding wizard for new organisations
- `/settings` with Profile, Team, and Billing tabs
- Public marketing landing page with pricing, features, and CTA sections

---

## Architecture Decisions

| Decision | Choice | Why | What I'd reconsider at scale |
|---|---|---|---|
| **Auth** | Supabase Auth | Handles email/password, magic links, OAuth, and invite flows out of the box. The PKCE implementation is correct by default, which is hard to get right from scratch. | At >100k users, migrating off Supabase Auth is painful. Would evaluate Auth0 or a self-hosted Keycloak deployment for enterprises that need SAML/SSO. |
| **ORM** | Prisma 7 | TypeScript-first schema, excellent migration tooling, driver adapter pattern works well with Supabase's pgBouncer. `prisma.$transaction` gives atomic multi-table writes without raw SQL. | Prisma's query engine adds latency compared to raw SQL for complex joins. At scale, would use Drizzle (zero-overhead, type-safe SQL) or keep Prisma but move hot paths to `$queryRaw`. |
| **PDF generation** | @react-pdf/renderer | Server-side PDF generation with a React component model. No browser dependency, no headless Chrome, no external service. | react-pdf runs synchronously and blocks the Node.js thread for large documents (~200ms per report). At scale, move to a queue (BullMQ / Inngest) so cron doesn't time out on large orgs. |
| **Email delivery** | Resend | Simple REST API, excellent React Email integration, generous free tier. Zero infrastructure to manage. | Single vendor dependency. At scale, add a fallback (SES/Postmark) and an outbox pattern so failed sends can be retried without re-running the cron job. |
| **Cron** | Vercel Cron | Zero infrastructure — declare cron schedule in `vercel.json`, Vercel calls the route. | Vercel Cron has a 25-second execution limit per invocation. For large orgs with many clients, the report generation loop would need to be chunked across multiple invocations or moved to a proper queue. |
| **Rate limiting** | Upstash Redis | Serverless-native Redis with REST API — works in Edge Runtime and Node.js alike. Sliding window algorithm is fair and predictable. Fail-open on Redis error keeps the app available. | Upstash free tier is 10k commands/day. At production scale, need a paid tier or self-hosted Valkey. Also: per-IP rate limiting is easily bypassed with IPv6 rotation; would add user-ID-based limiting for authenticated routes. |

---

## Local Dev Setup

Follow every step in order. Skipping the Supabase steps results in empty tables — RLS silently denies all rows when the JWT `org_id` claim is missing.

### Prerequisites

- Node.js 20+
- pnpm (`npm install -g pnpm`)
- A [Supabase](https://supabase.com) project (free tier is fine)
- A [Stripe](https://stripe.com) account (test mode)

### 1. Clone and install

```bash
git clone https://github.com/lcolon231/Clientpulse.git clientpulse
cd clientpulse
pnpm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in all values — see the [Environment Variables](#environment-variables) table below.

### 3. Push the database schema

```bash
pnpm db:push
```

This creates all tables (`organizations`, `users`, `clients`, `devices`, `audit_logs`) and the `SlaTier` enum. Prisma uses `DIRECT_URL` (port 5432) for DDL — pgBouncer (6543) does not support DDL.

### 4. Apply the RLS migrations

Prisma creates tables but does not enable Row-Level Security. Apply both migrations manually:

1. Supabase Dashboard → **SQL Editor**
2. Paste and run `prisma/migrations/manual/001_rls_policies.sql`
3. Paste and run `prisma/migrations/manual/002_rls_organizations_users.sql`

### 5. Activate the Custom Access Token Hook

Without this step, `org_id` is missing from every JWT and RLS silently denies all rows.

1. Supabase Dashboard → **Authentication → Hooks**
2. Under **Custom Access Token**, select `public.custom_access_token_hook`
3. Save

### 6. Configure auth redirect URLs

1. Supabase Dashboard → **Authentication → URL Configuration → Redirect URLs**
2. Add `http://localhost:3000/auth/callback`

### 7. Run the dev server

```bash
pnpm dev
```

Visit `http://localhost:3000` — the marketing landing page. Click **Get Started** to sign up.

### Useful scripts

| Script | Description |
|---|---|
| `pnpm dev` | Start Next.js dev server |
| `pnpm build` | Production build |
| `pnpm type-check` | TypeScript check (no emit) |
| `pnpm lint` | ESLint |
| `pnpm format` | Prettier write |
| `pnpm db:push` | Push Prisma schema to database |
| `pnpm db:generate` | Regenerate Prisma Client |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm analyze` | Run bundle analyzer (opens browser report) |

---

## Environment Variables

| Variable | Description | Where to find it |
|---|---|---|
| `DATABASE_URL` | Supabase Postgres — transaction pooler (port 6543). Used by Prisma at runtime. | Supabase Dashboard → Project Settings → Database → Connection string → **Transaction** |
| `DIRECT_URL` | Supabase Postgres — direct connection (port 5432). Used by Prisma for migrations only. | Supabase Dashboard → Project Settings → Database → Connection string → **Direct** |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase admin key — bypasses RLS. Used server-side to create/delete Auth users. Never expose to the browser. | Supabase Dashboard → Project Settings → API → **service_role** key |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL — safe for browser. | Supabase Dashboard → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key — safe for browser; RLS enforces tenant isolation. | Supabase Dashboard → Project Settings → API → **anon / public** key |
| `NEXT_PUBLIC_SITE_URL` | Full app origin (no trailing slash). Used in auth email links. Dev: `http://localhost:3000` | Set manually |
| `STRIPE_SECRET_KEY` | Stripe secret key for Checkout, Portal, and webhook verification. | Stripe Dashboard → Developers → API keys → **Secret key** |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret — validates that webhook payloads come from Stripe. | Stripe Dashboard → Webhooks → endpoint → **Signing secret** |
| `RESEND_API_KEY` | Resend API key for transactional email (reports and alerts). | [Resend Dashboard](https://resend.com) → API Keys |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST endpoint. Used for rate limiting. App fails open if missing. | [Upstash Console](https://console.upstash.com) → Database → REST API |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token. | [Upstash Console](https://console.upstash.com) → Database → REST API |
| `CRON_SECRET` | Shared secret for the Vercel Cron route. Vercel injects this as `Authorization: Bearer`. | Generate a random 32-char string; set in Vercel project settings |

---

## Roadmap

| Feature | Description | Estimated effort |
|---|---|---|
| **ConnectWise / Autotask integration** | Read-only ticket feed from MSP PSA platforms. Surface open ticket count per client on the detail page. | 2–3 weeks (OAuth + webhook listener per platform) |
| **AI-generated report summaries** | Use the Anthropic API to generate a plain-English health summary per client, included in the monthly PDF. | 3–4 days (prompt engineering + PDF layout update) |
| **Mobile app** | React Native (Expo) companion app — push notifications for CRITICAL alerts, client health cards, quick device lookup. | 4–6 weeks |
| **White-labeling** | Allow MSPs to customise the dashboard logo, colours, and email sender name. Adds a branding table to the schema. | 1–2 weeks (theming system + email template update) |
| **Backup status aggregation** | Poll Veeam, Acronis, or Datto APIs to surface backup job status alongside device health. | 2–4 weeks per integration |
| **Role management UI** | Owners can promote/demote users and revoke access from the Settings page. Currently roles are set at invite time and require direct DB access to change. | 3–5 days |

---

## License

MIT — see [LICENSE](./LICENSE).

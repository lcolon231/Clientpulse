# ClientPulse

ClientPulse is a multi-tenant SaaS dashboard built for Managed Service Providers (MSPs) to monitor the health of their small-business clients from a single pane of glass. Each MSP organisation sees only its own data — ticket queues, device health, backup status, and SLA metrics — enforced at the database layer via Postgres Row-Level Security rather than application-level filtering. Built by NodeLink Technologies as both a production internal tool and a portfolio flagship.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript strict) |
| Styling | Tailwind CSS v4 + shadcn/ui (base-nova style) |
| Auth | Supabase Auth (email/password, PKCE flow) |
| Database | Supabase Postgres with Row-Level Security |
| ORM | Prisma (transaction-mode pooler at runtime, direct URL for migrations) |
| Validation | Zod (schema-first, shared between client and server) |
| Forms | react-hook-form + @hookform/resolvers/zod |
| CSV parsing | Papaparse |
| Billing | Stripe (Checkout, Billing Portal, Webhooks) |
| Package manager | pnpm |
| Deploy target | Vercel |

---

## Local dev setup

Follow every step in order. Skipping the Supabase configuration steps will result in empty tables (RLS silently denies all rows when the JWT claim is missing).

### 1. Prerequisites

- Node.js 20+
- pnpm (`npm install -g pnpm`)
- A [Supabase](https://supabase.com) project (free tier is fine)

### 2. Clone and install

```bash
git clone <your-repo-url> clientpulse
cd clientpulse
pnpm install
```

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in all values:

**Supabase / core**

| Variable | Where to find it |
|---|---|
| `DATABASE_URL` | Project Settings → Database → Connection string → **Transaction** (port 6543) |
| `DIRECT_URL` | Project Settings → Database → Connection string → **Direct** (port 5432) |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → **service_role** key |
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API → **anon / public** key |
| `NEXT_PUBLIC_SITE_URL` | Set to `http://localhost:3000` for local dev |

**Reports & alerts (Week 5)**

| Variable | Where to find it |
|---|---|
| `RESEND_API_KEY` | [resend.com/api-keys](https://resend.com/api-keys) |
| `CRON_SECRET` | Generate with `openssl rand -hex 32`; set the same value in Vercel project settings |

**Billing (Week 6)**

| Variable | Where to find it |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API keys → Secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Developers → Webhooks → your endpoint → Signing secret |
| `STRIPE_PRICE_STARTER` | Stripe Dashboard → Products → your Starter product → Price ID |
| `STRIPE_PRICE_GROWTH` | Stripe Dashboard → Products → your Growth product → Price ID |
| `STRIPE_PRICE_ENTERPRISE` | Stripe Dashboard → Products → your Enterprise product → Price ID |

### 4. Push the Prisma schema

This creates all five tables (`organizations`, `users`, `clients`, `devices`, `audit_logs`) and the `SlaTier` enum in your Supabase project:

```bash
pnpm db:push
```

> Prisma uses `DIRECT_URL` (port 5432) for this operation — the transaction pooler does not support DDL statements.

> **Week 3 note:** If you are upgrading an existing deployment that already has the `clients` table from Week 1–2, `db:push` will add the five new columns (`industry`, `primary_contact`, `primary_contact_email`, `sla_tier`, `notes`) non-destructively. All new columns are nullable except `sla_tier`, which defaults to `BASIC`.

### 5. Apply the manual migrations

The Prisma schema creates tables but does not enable Row-Level Security, and does not add the Stripe billing columns. Apply all hand-written migrations in order:

1. Open your Supabase project → **SQL Editor**
2. Paste and run each file in order:
   - `prisma/migrations/manual/001_rls_policies.sql`
   - `prisma/migrations/manual/002_rls_organizations_users.sql`
   - `prisma/migrations/manual/003_alert_logs.sql`
   - `prisma/migrations/manual/004_stripe_billing.sql`
3. Run the verification queries at the bottom of each file to confirm everything is in place

### 6. Activate the Custom Access Token Hook

Without this step, the `org_id` claim will be missing from every JWT and all RLS policies will silently deny every row.

1. Supabase Dashboard → **Authentication → Hooks**
2. Under **Custom Access Token**, select `public.custom_access_token_hook`
3. Click **Save**

### 7. Configure auth email redirect URLs

The password reset and invite flows send emails with links back to your app. Supabase validates the redirect URL against an allowlist.

1. Supabase Dashboard → **Authentication → URL Configuration**
2. Under **Redirect URLs**, add `http://localhost:3000/auth/callback`
3. For production, also add `https://your-app.vercel.app/auth/callback`

> Without this step, password reset and invite emails will fail with a "redirect_uri_mismatch" error.

### 8. Disable email confirmation (development only)

By default Supabase requires email confirmation before a new account is active. For local development, disable it:

1. Supabase Dashboard → **Authentication → Providers → Email**
2. Toggle **Confirm email** off
3. Save

> Re-enable this before going to production.

### 9. Run the dev server

```bash
pnpm dev
```

Visit `http://localhost:3000/signup`, create an account, and confirm you land on `/dashboard` showing your organisation name and the full app layout.

### 10. Verify (optional)

```bash
pnpm type-check   # TypeScript — should produce no errors
pnpm lint         # ESLint
pnpm format:check # Prettier
```

---

## Project structure

```
/app
  /(auth)            Public auth routes (no session required)
    /login           Sign-in page with "Forgot password?" link
    /signup          New org registration (atomic org + user transaction)
    /forgot-password Request password reset email
    /reset-password  Set new password (after clicking reset link)
    /accept-invite   Complete invite setup (display name + password)
  /(app)             Session-required routes — all wrapped by AppShell
    /dashboard       Main dashboard: empty-state card + Invite Technician (owner only)
    /clients         Client list — search, SLA filter, Add Client modal
      /[id]          Client detail — Overview / Devices / Tickets / Reports tabs
    /coming-soon     Placeholder for sidebar nav links not yet built
  /auth
    /callback        Route handler: exchanges Supabase PKCE code for a session,
                     handles both password reset (type=recovery) and invite (type=invite)
  /api               Route handlers (reserved for future use)

/components
  /ui                Primitives (Button, Input, Label, Avatar, Card, Dialog, Sheet,
                     Badge, Select, Textarea, Table, Tabs, Separator, Toast)
  /app               Composed app components:
    /clients           ClientListPage, AddClientDialog, EditClientDialog,
                       DeleteClientDialog, ClientDetailPage
    /devices           DevicesTab, DeviceForm, AddDeviceDialog, EditDeviceDialog,
                       DeleteDeviceDialog, TagBadge, CSVImportDialog
                     AppShell      — top nav + desktop sidebar + mobile Sheet drawer
                     Sidebar       — nav links (SidebarNav)
                     LoginForm     — sign-in with "Forgot password?" link
                     SignupForm     — new org registration
                     SignOutButton — logout
                     ForgotPasswordForm — reset request (browser Supabase client for PKCE)
                     ResetPasswordForm  — set new password
                     AcceptInviteForm   — complete invite (name + password)
                     InviteModal        — owner-only invite dialog

/lib
  /supabase          browser.ts · server.ts · admin.ts
  /db                prisma.ts (singleton with hot-reload guard)
  /auth              index.ts (getAuthUser, getDbUser, requireAuth, requireOwner)
  audit.ts           logAudit() — append-only audit log writer
  env.ts             Single typed, Zod-validated env entry point
  utils.ts           cn() Tailwind class merger

/prisma
  schema.prisma
  /migrations
    /manual          Hand-written SQL (RLS policies, JWT hook, DDL)

/types               Shared TypeScript types
/docs                Test plans and technical reference
```

---

## Billing & subscriptions (Week 6)

ClientPulse uses Stripe for subscription management. Three plans are available:

| Plan | Clients | Devices | CSV Import | Scheduled Reports |
|---|---|---|---|---|
| Starter (free) | 10 | 50 | — | — |
| Growth | 50 | 500 | Yes | Yes |
| Enterprise | Unlimited | Unlimited | Yes | Yes |

### How it works

- **`lib/plans.ts`** — `PLAN_LIMITS`, `canAddClient`, `canAddDevice`, `canUseFeature` are the single source of truth for all plan enforcement
- **`/billing`** — shows current plan, usage bars, plan cards with Subscribe / Current Plan buttons, and a Manage Billing button (when a Stripe customer exists)
- **`/api/billing/checkout`** — creates or retrieves the Stripe customer, then starts a hosted Checkout session in `subscription` mode
- **`/api/billing/portal`** — creates a Billing Portal session so customers can update payment methods or cancel
- **`/api/webhooks/stripe`** — handles `checkout.session.completed`, `customer.subscription.updated`, and `customer.subscription.deleted`; verifies the Stripe signature before processing
- **Feature gating** — `createClient` and `createDevice` server actions check plan limits before inserting; `bulkCreateDevices` blocks CSV import on Starter and caps imports at the remaining device capacity with a warning; the monthly-reports cron skips orgs without `scheduled_reports`
- **UI gating** — the dashboard shows an approaching-limit banner within 2 clients or 10 devices of the plan ceiling; the CSV Import button is disabled with a tooltip on Starter; the Add Client button is disabled at the limit

### Local Stripe testing

```bash
# Install the Stripe CLI, then forward webhooks to your local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the webhook signing secret printed by the CLI into `STRIPE_WEBHOOK_SECRET` in `.env.local`.

---

## Auth & tenancy architecture

### JWT org_id claim

Every Supabase JWT carries a custom `org_id` claim injected by `public.custom_access_token_hook` (a Postgres function configured as a Supabase Auth Hook). RLS policies compare this claim against the `organization_id` column on every row — no application-level tenant filtering needed.

### Invite flow

1. Owner calls `inviteUserAction` (server action, protected by `requireOwner()`)
2. The action calls `admin.auth.admin.inviteUserByEmail(email, { data: { org_id } })` — stores the org ID in `raw_user_meta_data` on the invited auth user
3. Supabase sends the invite email; invited user clicks link → `/auth/callback` exchanges the PKCE code for a session
4. User lands on `/accept-invite`: sets display name + password; the server action creates their `public.users` row via Prisma (bypasses RLS), then calls `supabase.auth.refreshSession()` to mint a new JWT with `org_id` embedded
5. User is redirected to `/dashboard` with a fully valid session

### Password reset

Uses Supabase's PKCE flow. `resetPasswordForEmail` is called from the **browser** Supabase client (not a Server Action) so the PKCE code verifier stays in the browser's cookie jar for the subsequent callback exchange.

### Role system

Three roles: `OWNER`, `TECHNICIAN`, `READONLY` (stored on `public.users.role`).

- `requireAuth()` — verifies session and returns `dbUser`; used by all protected pages
- `requireOwner()` — extends `requireAuth()`, throws `403 Response` if role is not `OWNER`
- UI visibility: the "Invite Technician" button is only rendered when `dbUser.role === 'OWNER'`
- Mutation gates: "Add Device" / "Import CSV" buttons are hidden for `READONLY`; "Delete Client" is hidden for non-`OWNER`. Server actions perform the same role check independently of the UI state.

---

## Client & Device CRUD (Week 3)

### Data model additions

The `Client` table gained five new columns in Week 3:

| Column | Type | Notes |
|---|---|---|
| `industry` | `text` (nullable) | Free-form industry label |
| `primary_contact` | `text` (nullable) | Display name of the main contact |
| `primary_contact_email` | `text` (nullable) | Contact email address |
| `sla_tier` | `sla_tier` enum | `BASIC` / `STANDARD` / `PREMIUM`, defaults to `BASIC` |
| `notes` | `text` (nullable) | Free-form notes |

### Audit log actions

Every mutation writes an immutable row to `audit_logs`:

| Action | Trigger | Metadata |
|---|---|---|
| `client_created` | Add Client form submitted | `{ client_name }` |
| `client_updated` | Edit Client form saved | `{ client_name, changed_fields[] }` |
| `client_deleted` | Delete confirmed (OWNER only) | `{ client_name }` |
| `device_added` | Add Device form submitted | `{ hostname, client_id }` |
| `device_updated` | Edit Device form saved | `{ hostname, changed_fields[] }` |
| `device_deleted` | Delete device confirmed | `{ hostname, client_id }` |
| `devices_csv_imported` | CSV import confirmed | `{ count, client_id }` |

### CSV import format

The "Import CSV" button on the Devices tab accepts files with these columns:

```
hostname,type,os,os_version,last_seen,patch_age_days,tags
web-01,Server,Ubuntu,22.04,2025-05-15,5,"Server,Network"
```

- `hostname` and `type` are required; rows missing either are highlighted red and skipped
- `type` must be one of: `Server`, `Workstation`, `Laptop`, `Network`, `Other`
- `tags` is a comma-separated list inside a quoted cell
- All other columns are optional
- Valid rows are bulk-inserted atomically via a single `createMany` call

### Tag colour mapping

| Tag | Colour |
|---|---|
| Server | Blue |
| Workstation | Purple |
| Laptop | Indigo |
| Network | Green |
| Firewall | Orange |
| NAS | Yellow |
| (free-form) | Gray |

---

## Available scripts

| Script | Description |
|---|---|
| `pnpm dev` | Start Next.js dev server |
| `pnpm build` | Production build |
| `pnpm type-check` | TypeScript check (no emit) |
| `pnpm lint` | ESLint |
| `pnpm format` | Prettier write |
| `pnpm format:check` | Prettier check (CI) |
| `pnpm db:push` | Push Prisma schema to database |
| `pnpm db:generate` | Regenerate Prisma Client after schema changes |
| `pnpm db:studio` | Open Prisma Studio (local DB browser) |

---

## Roadmap

| Week | Theme | Status |
|---|---|---|
| 1 | Foundation — schema, RLS, auth (signup / login / logout), dashboard placeholder | Done |
| 2 | Auth & Tenancy — password reset, invite flow, role system, dashboard layout | Done |
| 3 | Clients & Devices CRUD — client list/detail, device table, CSV import, tag system, audit log | Done |
| 4 | Health scoring — patch-age scoring, Recharts dashboard (activity, device health, SLA charts) | Done |
| 5 | Reports & Alerts — PDF monthly reports, scheduled email via Resend, threshold alert emails | Done |
| 6 | Billing & Subscriptions — Stripe plans (Starter/Growth/Enterprise), feature gating, usage UI | Done |
| 7 | Ticket integration — ConnectWise / Autotask read-only feed | Planned |
| 8 | Backup status aggregation | Planned |
| 9 | SLA metrics and threshold alerting | Planned |
| 10 | Role management UI + audit log viewer | Planned |

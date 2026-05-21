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

Open `.env.local` and fill in all six values:

| Variable | Where to find it |
|---|---|
| `DATABASE_URL` | Project Settings → Database → Connection string → **Transaction** (port 6543) |
| `DIRECT_URL` | Project Settings → Database → Connection string → **Direct** (port 5432) |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → **service_role** key |
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API → **anon / public** key |
| `NEXT_PUBLIC_SITE_URL` | Set to `http://localhost:3000` for local dev |

### 4. Push the Prisma schema

This creates all five tables (`organizations`, `users`, `clients`, `devices`, `audit_logs`) in your Supabase project:

```bash
pnpm db:push
```

> Prisma uses `DIRECT_URL` (port 5432) for this operation — the transaction pooler does not support DDL statements.

### 5. Apply the RLS migrations

The Prisma schema creates tables but does not enable Row-Level Security. Apply both hand-written migrations manually:

1. Open your Supabase project → **SQL Editor**
2. Paste and run `prisma/migrations/manual/001_rls_policies.sql`
3. Paste and run `prisma/migrations/manual/002_rls_organizations_users.sql`
4. Run the verification queries at the bottom of each file to confirm everything is in place

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
    /coming-soon     Placeholder for sidebar nav links (Clients, Devices, etc.)
  /auth
    /callback        Route handler: exchanges Supabase PKCE code for a session,
                     handles both password reset (type=recovery) and invite (type=invite)
  /api               Route handlers (reserved for future use)

/components
  /ui                shadcn primitives (Button, Input, Label, Avatar, Card, Dialog, Sheet)
  /app               Composed app components:
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
| 3 | Client management — CRUD, search, pagination | Upcoming |
| 4 | Device inventory — list devices per client, patch-age health scoring | Planned |
| 5 | Ticket integration — ConnectWise / Autotask read-only feed | Planned |
| 6 | Backup status aggregation | Planned |
| 7 | SLA metrics and threshold alerting | Planned |
| 8 | PDF report generation | Planned |
| 9 | Role management UI + audit log viewer | Planned |

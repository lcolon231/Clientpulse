# ClientPulse

ClientPulse is a multi-tenant SaaS dashboard built for Managed Service Providers (MSPs) to monitor the health of their small-business clients from a single pane of glass. Each MSP organisation sees only its own data — ticket queues, device health, backup status, and SLA metrics — enforced at the database layer via Postgres Row-Level Security rather than application-level filtering. Built by NodeLink Technologies as both a production internal tool and a portfolio flagship.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript strict) |
| Styling | Tailwind CSS v4 + shadcn/ui (base-nova style) |
| Auth | Supabase Auth (email/password) |
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


Open `.env.local` and fill in the five values. All of them are in your Supabase Dashboard:

| Variable | Where to find it |
|---|---|
| `DATABASE_URL` | Project Settings → Database → Connection string → **Transaction** (port 6543) |
| `DIRECT_URL` | Project Settings → Database → Connection string → **Direct** (port 5432) |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → **service_role** key |
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API → **anon / public** key |

### 4. Push the Prisma schema

This creates the five tables (`organizations`, `users`, `clients`, `devices`, `audit_logs`) in your Supabase project:

```bash
pnpm db:push
```

> Prisma uses `DIRECT_URL` (port 5432) for this operation — the transaction pooler does not support DDL statements.

### 5. Apply the RLS migration

The Prisma schema creates tables but does not enable Row-Level Security. Apply the hand-written migration manually:

1. Open your Supabase project → **SQL Editor**
2. Paste the full contents of `prisma/migrations/manual/001_rls_policies.sql`
3. Click **Run**
4. Run the four verification queries at the bottom of that file to confirm everything is in place

### 6. Activate the Custom Access Token Hook

Without this step, the `org_id` claim will be missing from every JWT and all RLS policies will silently deny every row.

1. Supabase Dashboard → **Authentication → Hooks**
2. Under **Custom Access Token**, select `public.custom_access_token_hook`
3. Click **Save**

### 7. Disable email confirmation (development only)

By default Supabase requires email confirmation before a new account is active. For local development, disable it:

1. Supabase Dashboard → **Authentication → Providers → Email**
2. Toggle **Confirm email** off
3. Save

> Re-enable this before going to production.

### 8. Run the dev server

```bash
pnpm dev
```

Visit `http://localhost:3000/signup`, create an account, and confirm you land on `/dashboard` showing your email and organisation name.

### 9. Verify (optional)

```bash
pnpm type-check   # TypeScript — should produce no errors
pnpm lint         # ESLint
pnpm format:check # Prettier
```

---

## Project structure

```
/app
  /(auth)          /login, /signup — public routes
  /(app)           /dashboard and future auth-required routes
  /api             Route handlers (empty in Week 1)
/components
  /ui              shadcn primitives (Button, Input, Label, …)
  /app             Composed app components (LoginForm, SignupForm, …)
/lib
  /supabase        browser.ts · server.ts · admin.ts
  /db              prisma.ts (singleton with hot-reload guard)
  /auth            index.ts (getAuthUser, getDbUser, requireAuth)
  env.ts           Single typed, Zod-validated env entry point
  utils.ts         cn() Tailwind class merger
/prisma
  schema.prisma
  /migrations
    /manual        Hand-written SQL (RLS policies, future DDL)
/types             Shared TypeScript types and Zod schemas
/docs              Test plans and technical reference
```

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

<!--
Week 2 — Client management (CRUD, search, pagination)
Week 3 — Device inventory and patch-age health scoring
Week 4 — Ticket integration (ConnectWise / Autotask)
Week 5 — Backup status aggregation
Week 6 — SLA metrics and threshold alerting
Week 7 — PDF report generation
Week 8 — Multi-technician RBAC and audit log viewer
-->

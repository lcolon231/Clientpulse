# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev              # Start dev server (localhost:3000)
pnpm build            # Production build
pnpm type-check       # TypeScript validation (no emit)
pnpm lint             # ESLint (flat config, v9)
pnpm lint:fix         # ESLint with auto-fix
pnpm format           # Prettier write
pnpm format:check     # Prettier check (CI)
pnpm db:push          # Push Prisma schema to Supabase (uses DIRECT_URL, port 5432)
pnpm db:generate      # Regenerate Prisma client after schema changes
pnpm db:studio        # Open Prisma Studio
```

There are no automated tests. Manual test plans live in `/docs/`.

## Architecture

**ClientPulse** is a multi-tenant SaaS dashboard for Managed Service Providers (MSPs). Each MSP is an `Organization`; their clients and devices are isolated via Postgres Row-Level Security (RLS) enforced by a JWT claim (`org_id`).

### Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 App Router, TypeScript strict |
| UI | React 19 + Tailwind CSS v4 + shadcn/ui (base-nova) |
| Auth | Supabase Auth (email/password, PKCE) |
| Database | Supabase Postgres with RLS |
| ORM | Prisma 7 with `@prisma/adapter-pg` (external pg driver) |
| Validation | Zod (shared client/server schemas) |
| Forms | react-hook-form + @hookform/resolvers/zod |

### Route Groups

- `/(auth)` — Public routes: `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/accept-invite`
- `/(app)` — Session-required routes wrapped by `AppShell`: `/dashboard`, `/clients`, `/clients/[id]`
- `/auth/callback` — GET route handler: exchanges Supabase PKCE code for session cookie

### Data Flow (Server Actions)

All mutations go through Server Actions (`"use server"` files in `lib/actions/`). The pattern:

1. `requireAuth()` — verifies session with Supabase servers, returns `{ authUser, dbUser }`
2. Role check against `dbUser.role` (OWNER / TECHNICIAN / READONLY)
3. Zod `safeParse` on raw form data
4. Prisma query scoped to `dbUser.organizationId`
5. `logAudit()` (non-fatal — never throws)
6. `revalidatePath()` to bust Next.js cache
7. Return `{ success: true, data }` or `{ success: false, error: string }`

No exceptions propagate to clients; all actions return a discriminated union.

### Multi-Tenant Isolation (Defense in Depth)

Two layers enforce tenant isolation:

1. **RLS (hard boundary):** Every query on `clients`, `devices`, `auditLogs`, `organizations`, `users` is filtered by `requesting_org_id()` — a Postgres helper that extracts `org_id` from the JWT. This is set up in `prisma/migrations/manual/` (hand-written SQL, not Prisma-managed).

2. **Application layer (fast path):** Server Actions filter by `organizationId` from `dbUser` before hitting the DB.

**JWT claim injection:** Supabase Auth calls `custom_access_token_hook()` (Postgres function) on every token mint/refresh, embedding `org_id` into the JWT. This hook must be enabled in Supabase Dashboard → Auth → Hooks.

**Prisma bypasses RLS** because it connects as the Postgres superuser — audit log writes rely on this intentionally. The PostgREST / Supabase client layer obeys RLS.

### Database Schema

Five tables managed by Prisma (`prisma/schema.prisma`):

- **organizations** — tenant root
- **users** — MSP employees; `supabaseUserId` links to Supabase Auth UUID; `role`: OWNER | TECHNICIAN | READONLY
- **clients** — small-business clients managed by the MSP; `slaTier`: BASIC | STANDARD | PREMIUM | ENTERPRISE
- **devices** — endpoints per client; `tags` is a Postgres text array
- **auditLogs** — append-only, immutable; `metadata` is JSON

RLS policies and the JWT hook function live in `prisma/migrations/manual/*.sql` — apply these manually in the Supabase SQL Editor when setting up a new instance.

### Auth Flows

**Signup:** Admin Supabase client creates `auth.users` → Prisma transaction inserts `Organization` + `User` → cleanup on failure → auto sign-in.

**Invite:** Owner calls `inviteUserAction()` → Supabase sends invite email with PKCE link → user lands on `/auth/callback?next=/accept-invite` → sets name + password → `acceptInviteAction()` reads `org_id` from `authUser.user_metadata` → creates `User` row → `supabase.auth.refreshSession()` to get JWT with `org_id` claim.

**Password reset:** Same PKCE pattern; `/reset-password` reads token from URL hash.

### Key Files

| Path | Purpose |
|------|---------|
| `lib/auth/index.ts` | `requireAuth()`, `requireOwner()` guards |
| `lib/db/prisma.ts` | Singleton Prisma client (HMR-safe via `globalThis`) |
| `lib/supabase/server.ts` | `createServerSupabaseClient()` for Server Components/Actions |
| `lib/supabase/admin.ts` | `createAdminSupabaseClient()` (service-role key — privileged ops only) |
| `lib/audit.ts` | `logAudit()` — non-fatal append to `auditLogs` |
| `lib/env.ts` | Zod-validated env vars; server-only vars throw at build if imported client-side |
| `types/client.ts` | Client Zod schema, `SLA_TIER_LABELS`, `INDUSTRY_OPTIONS` |
| `types/device.ts` | Device Zod schema, CSV import shape |
| `prisma/config.ts` | Loads `.env.local` for Prisma CLI; sets `DIRECT_URL` for migrations |

### Environment Variables

**Server-only (never expose to browser):**
- `DATABASE_URL` — pgBouncer transaction-mode pooler (port 6543)
- `DIRECT_URL` — direct Postgres (port 5432); required for `db:push` / migrations
- `SUPABASE_SERVICE_ROLE_KEY` — admin key for privileged ops

**Client-safe (NEXT_PUBLIC_ prefix):**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — safe; RLS enforces isolation
- `NEXT_PUBLIC_SITE_URL` — used in auth email redirect URLs

### Styling Conventions

- Tailwind v4 with PostCSS; no `tailwind.config.js` — config is in CSS
- Use `cn()` from `lib/utils.ts` (wraps `clsx` + `tailwind-merge`) for conditional classes
- `class-variance-authority` for component variants
- `AppShell` is responsive: sidebar visible at `md:` breakpoint; mobile uses a Sheet drawer

### Roles & Guards

| Role | Can Do |
|------|--------|
| OWNER | Invite technicians, full CRUD |
| TECHNICIAN | Create/edit clients and devices |
| READONLY | Read-only access |

- Server Actions use `requireAuth()` or `requireOwner()` before any mutation
- UI gates (invite button, delete buttons) check `dbUser.role === 'OWNER'` inline

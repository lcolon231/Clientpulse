# Contributing to ClientPulse

Thanks for your interest in contributing. This document explains how to get the project running locally, the branch naming conventions, and the pull request process.

---

## Running Locally

### Prerequisites

- Node.js 20+
- pnpm (`npm install -g pnpm`)
- A Supabase project (free tier)
- A Stripe account (test mode)

### Steps

```bash
# 1. Clone the repo
git clone https://github.com/lcolon231/Clientpulse.git
cd Clientpulse

# 2. Install dependencies
pnpm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local — see README.md § Environment Variables for the full table

# 4. Push the Prisma schema
pnpm db:push

# 5. Apply the RLS migrations (one-time setup)
# Paste prisma/migrations/manual/001_rls_policies.sql into Supabase SQL Editor
# Paste prisma/migrations/manual/002_rls_organizations_users.sql

# 6. Enable the Custom Access Token Hook
# Supabase Dashboard → Authentication → Hooks → Custom Access Token
# Select public.custom_access_token_hook → Save

# 7. Start the dev server
pnpm dev
```

Visit `http://localhost:3000` to see the landing page. Click **Get Started** to create an account.

### Useful commands

```bash
pnpm type-check   # TypeScript (no emit)
pnpm lint         # ESLint
pnpm format       # Prettier (write)
pnpm analyze      # Bundle analyzer (opens browser report)
pnpm db:studio    # Prisma Studio (visual DB browser)
```

---

## Branch Naming

| Prefix | Use for |
|---|---|
| `feat/` | New features (`feat/csv-import`, `feat/stripe-portal`) |
| `fix/` | Bug fixes (`fix/rls-policy-insert`, `fix/rate-limit-bypass`) |
| `chore/` | Maintenance, deps, config (`chore/upgrade-prisma`, `chore/ci-cache`) |
| `docs/` | Documentation only (`docs/readme-overhaul`) |
| `refactor/` | Code restructuring with no behaviour change |

Branch names should be lowercase, hyphenated, and descriptive:

```
feat/ai-report-summaries
fix/not-found-middleware
chore/add-bundle-analyzer
```

---

## Pull Request Process

1. **Branch off `main`** — keep branches short-lived (1–3 days max).

2. **Fill in the PR template** — the `.github/pull_request_template.md` covers summary, type of change, and checklist. Don't skip the checklist.

3. **CI must be green** — all three jobs must pass before merge:
   - `typecheck` — `pnpm tsc --noEmit`
   - `lint` — `pnpm lint`
   - `build` — `pnpm build` with production env vars

4. **No `console.log` or `console.error` in server code** — use `logger.info` / `logger.error` from `lib/logger.ts`. Client components may use `console.error` inside `useEffect` for error boundaries.

5. **All mutations must call `logAudit()`** — the immutable audit trail is a core product guarantee.

6. **Rate-limit new public-facing endpoints** — add `rateLimit()` or `rateLimitByIp()` from `lib/ratelimit.ts` to any new API route or Server Action that is callable without authentication.

7. **Squash merge preferred** — keeps `main` history linear and readable.

8. **One approval required** — the PR author cannot approve their own PR.

---

## Questions?

Open a GitHub Discussion or email the maintainer directly (see the [case study page](/case-study) footer for contact details).

# Health Scoring

ClientPulse computes a 0–100 health score for each client. The score is deterministic and computed from device data only — no fake or placeholder data for missing future inputs.

## Formula

```
score = Σ (component.score × component.weight)   →  rounded to integer
```

All weights must sum to 1.0.

### Components

| Component | Weight | Description |
|-----------|--------|-------------|
| Patch Freshness | **0.7** | Are devices being patched regularly? |
| Device Coverage | **0.3** | Are devices checking in (reporting `lastSeen`)? |

#### Patch Freshness (weight 0.7)

Scored per device, then averaged across all devices for the client.

| `patchAgeDays` | Per-device score | Label |
|----------------|------------------|-------|
| ≤ 30 days | 100 | Current |
| 31–90 days | 50 | Aging (partial credit) |
| > 90 days or `null` | 0 | Stale / unknown |

#### Device Coverage (weight 0.3)

Scored per device, then averaged.

| `lastSeen` | Per-device score | Label |
|------------|------------------|-------|
| Within last 30 days | 100 | Reporting |
| Older than 30 days or `null` | 0 | Stale / unknown |

### Zero-device clients

A client with no registered devices has no data to score. Rather than defaulting to CRITICAL (which implies a known failure), ClientPulse returns **score = 75, band = FAIR** with a "No devices registered" detail. This communicates an unknown/neutral state without penalising a new or transitioning client.

## Score Bands

| Band | Score range | Meaning |
|------|------------|---------|
| HEALTHY | 85–100 | Well-maintained, up to date |
| FAIR | 70–84 | Minor gaps, monitor closely |
| AT_RISK | 50–69 | Notable gaps, action advised |
| CRITICAL | 0–49 | Significant risk, immediate attention |

## Code Location

All scoring logic lives in `lib/health/score.ts`. The function `calculateHealth(inputs)` is pure: no DB calls, no side effects, fully unit-testable. Tests are in `lib/health/score.test.ts`.

The canonical band→color mapping lives in `lib/health/bands.ts` (`BAND_HEX`, `BAND_LABELS`, `BAND_BADGE_CLASSES`, `BAND_SCORE_TEXT_CLASS`). Import from there; never hardcode hex values in components.

## Charts

Three recharts visualisations are built on top of server-computed props (no client-side fetching):

| Chart | Component | Where |
|-------|-----------|-------|
| Health distribution donut | `HealthDistributionChart` | Dashboard |
| Patch age bar chart | `PatchAgeChart` | Dashboard + client Reports tab |
| Score history line chart | `ScoreHistoryChart` | Client Reports tab |

All charts are `"use client"` components wrapped in `ResponsiveContainer`, with accessible `role="img"` + `aria-label` wrappers and empty-state renders when there is no data.

## Daily Health Snapshots

`HealthSnapshot` stores one score per client per calendar day, enabling score-over-time trends.

### Schema

| Field | Type | Notes |
|-------|------|-------|
| `id` | cuid | Primary key |
| `clientId` | FK → clients | Cascade delete |
| `organizationId` | FK → organizations | For RLS + query convenience |
| `date` | `date` (Postgres) | Calendar date, no time component |
| `score` | int | 0–100 |
| `band` | string | CRITICAL \| AT_RISK \| FAIR \| HEALTHY |
| `patchScore` | int? | Patch Freshness component score |
| `coverageScore` | int? | Device Coverage component score |

Unique constraint on `(clientId, date)` — one snapshot per client per day. Re-running the cron on the same day upserts (overwrites), never duplicates.

### Cron Job

`app/api/cron/health-snapshot/route.ts` is a Vercel Cron endpoint that:

1. Authenticates via `Authorization: Bearer <CRON_SECRET>` header (set `CRON_SECRET` in Vercel environment variables).
2. Iterates **every client across every org** using Prisma (which runs as the postgres superuser, bypassing RLS). This is an explicit admin operation — the only intentional cross-org boundary in the codebase.
3. Computes each client's health via `calculateHealth()` (the same pure engine used everywhere else).
4. Upserts a `HealthSnapshot` for today. Idempotent: safe to call multiple times per day.

**Schedule** (`vercel.json`): `0 6 * * *` — daily at 06:00 UTC.

> ⚠️ Cron jobs only run on the **deployed Vercel app**, not locally. To test the endpoint locally, send a GET request to `/api/cron/health-snapshot` with `Authorization: Bearer <CRON_SECRET>`.

### RLS

`prisma/migrations/manual/003_rls_health_snapshots.sql` — apply via Supabase SQL Editor after `prisma db push`. Grants SELECT to authenticated users for their own org's snapshots. No INSERT/UPDATE/DELETE policy for the authenticated role (all writes go through the cron's service-role key).

## Future Inputs

The formula is designed for easy extension. To add a new component:

1. Add a weight constant to `score.ts` (and reduce existing weights so they still sum to 1.0).
2. Add the required field(s) to the `HealthInputs` interface.
3. Compute the component score and push it to the `components` array.
4. Add a nullable column to `HealthSnapshot` for the component sub-score.
5. Update this document.

**Planned future components:**

| Component | Planned weight contribution | Data source |
|-----------|-----------------------------|-------------|
| Open ticket backlog | TBD | ConnectWise / Autotask integration |
| Backup success rate | TBD | Backup tool integration |
| SLA compliance | TBD | SLA tier vs. actual response metrics |

These components are intentionally absent until real data is available. The current 0.7/0.3 split reflects the only two data points we have today.

# Health Scoring

ClientPulse computes a 0-100 health score for each client. The current score is deterministic and computed from device data only. Ticket, backup, uptime, and security findings are intentionally absent until real integrations provide those inputs.

## Formula

```txt
score = sum(component.score * component.weight) -> rounded integer
```

All weights must sum to 1.0.

## Components

| Component | Weight | Description |
| --- | ---: | --- |
| Patch Freshness | 0.7 | Are devices being patched regularly? |
| Device Coverage | 0.3 | Are devices checking in through `lastSeen`? |

### Patch Freshness

Scored per device, then averaged across all devices for the client.

| `patchAgeDays` | Per-device score | Label |
| --- | ---: | --- |
| <= 30 days | 100 | Current |
| 31-90 days | 50 | Aging |
| > 90 days or `null` | 0 | Stale / unknown |

### Device Coverage

Scored per device, then averaged.

| `lastSeen` | Per-device score | Label |
| --- | ---: | --- |
| Within last 30 days | 100 | Reporting |
| Older than 30 days or `null` | 0 | Stale / unknown |

### Zero-device Clients

A client with no registered devices has no data to score. Rather than defaulting to CRITICAL, ClientPulse returns `score = 75`, `band = FAIR`, with a `No devices registered` detail.

## Score Bands

| Band | Score range | Meaning |
| --- | --- | --- |
| HEALTHY | 85-100 | Well-maintained, up to date |
| FAIR | 70-84 | Minor gaps, monitor closely |
| AT_RISK | 50-69 | Notable gaps, action advised |
| CRITICAL | 0-49 | Significant risk, immediate attention |

## Code Locations

| Area | Location |
| --- | --- |
| Pure scoring engine | `lib/health/score.ts` |
| Scoring tests | `lib/health/score.test.ts` |
| Server-side org/client health queries | `lib/health/calculate-client-health.ts` |
| Canonical band labels and colors | `lib/health/bands.ts` |
| Health badge UI | `components/ui/health-badge.tsx` |
| Dashboard charts | `components/app/dashboard/*Chart.tsx` |
| Monthly PDF report | `lib/pdf/monthly-report.tsx` |

Import band labels and colors from `lib/health/bands.ts`; do not scatter band hex values across UI or report code.

## Current Visualizations

Dashboard charts are client components fed by server-computed props:

| Chart | Component | Data source |
| --- | --- | --- |
| Tickets - Last 14 Days | `TicketsOverTimeChart` | Synced ticket creation dates grouped by day |
| Devices by Health | `DevicesByHealthChart` | Device patch-age buckets derived on the server |
| Clients by SLA Tier | `SlaPerformanceChart` | Client SLA tier counts |

Client detail reports currently provide a downloadable monthly PDF report at `/api/reports/[clientId]/monthly`.

## Ticket Data

The ticket feed foundation is documented in `docs/ticket-integration.md`. Ticket rows are displayed in the dashboard and client detail pages once synced, but they are not part of the health score yet. The score still uses only device patch freshness and device coverage.

## Planned Snapshot History

Score-over-time history is not implemented in the current schema. The next version should add a `HealthSnapshot` model with one row per client per calendar day, plus a Vercel Cron route that computes and upserts snapshots daily.

Recommended future fields:

| Field | Notes |
| --- | --- |
| `id` | Primary key |
| `clientId` | FK to `clients`, cascade delete |
| `organizationId` | FK to `organizations` for RLS/query convenience |
| `date` | Calendar date, unique with `clientId` |
| `score` | 0-100 integer |
| `band` | CRITICAL / AT_RISK / FAIR / HEALTHY |
| `patchScore` | Nullable component sub-score |
| `coverageScore` | Nullable component sub-score |

The cron route should be an explicit service-role admin operation and the only intentional cross-org health read path.

## Future Inputs

The formula is designed for extension. To add a new component:

1. Add a weight constant to `score.ts` and adjust existing weights so they still sum to 1.0.
2. Add the required field(s) to `HealthInputs`.
3. Compute the component score and push it to the `components` array.
4. Add nullable snapshot columns for component sub-scores once score history exists.
5. Update this document.

Planned future components:

| Component | Data source |
| --- | --- |
| Open ticket backlog | ConnectWise / Autotask ticket feed |
| Backup success rate | Backup tool integration |
| SLA compliance | SLA tier vs. actual response metrics |
| Security findings | EDR / vulnerability scanner integration |
| Uptime issues | Monitoring integration |

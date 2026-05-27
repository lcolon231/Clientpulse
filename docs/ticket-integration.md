# Ticket Integration

ClientPulse now has the database and UI foundation for a read-only PSA ticket feed. Ticket rows are normalized so ConnectWise and Autotask sync jobs can write into one common shape without changing dashboard or client-detail UI.

## Current Scope

Implemented:

- `TicketSource`, `TicketStatus`, and `TicketPriority` enums in Prisma.
- `Ticket` model with tenant scope (`organizationId`), optional client mapping (`clientId`), external source identity, status, priority, assignee, URL, external timestamps, and sync timestamp.
- Manual RLS migration in `prisma/migrations/manual/006_tickets_readonly_feed.sql`.
- Client detail Tickets tab backed by real ticket rows.
- Dashboard ticket trend chart based on synced ticket creation dates.
- Server-side ConnectWise and Autotask provider adapters.
- Vercel Cron endpoint at `/api/cron/ticket-sync` that syncs configured providers.
- `vercel.json` schedule: `0 7 * * *` (daily at 07:00 UTC).

Not implemented yet:

- Admin UI for storing per-tenant integration credentials.
- Ticket-derived health scoring weights.

No fake ticket data is seeded. Empty states remain empty until real integration syncs write rows.

## Configuration

The first production slice uses server environment variables for PSA credentials. This keeps secrets out of the browser and avoids storing third-party credentials in the database before encryption/key-rotation policy is designed.

Set `PSA_SYNC_ORGANIZATION_ID` when the database contains more than one organization. If it is omitted and exactly one organization exists, the sync uses that organization. If multiple organizations exist and the variable is omitted, the sync refuses to run rather than guessing.

Common:

| Variable | Purpose |
| --- | --- |
| `CRON_SECRET` | Bearer token required by `/api/cron/ticket-sync` |
| `PSA_SYNC_ORGANIZATION_ID` | Target ClientPulse org for server-env PSA credentials |
| `TICKET_SYNC_LOOKBACK_DAYS` | Ticket history window fetched each run, default `30` |

ConnectWise:

| Variable | Purpose |
| --- | --- |
| `CONNECTWISE_BASE_URL` | Manage API host, for example `https://api-na.myconnectwise.net` |
| `CONNECTWISE_COMPANY_ID` | ConnectWise company identifier |
| `CONNECTWISE_PUBLIC_KEY` | API member public key |
| `CONNECTWISE_PRIVATE_KEY` | API member private key |
| `CONNECTWISE_CLIENT_ID` | ConnectWise developer client ID |

Autotask:

| Variable | Purpose |
| --- | --- |
| `AUTOTASK_BASE_URL` | REST API base URL, for example `https://webservices.autotask.net/ATServicesRest/V1.0` |
| `AUTOTASK_USERNAME` | API user username |
| `AUTOTASK_SECRET` | API user secret |
| `AUTOTASK_INTEGRATION_CODE` | API integration code |

## Local Test

Run the app, then call the cron endpoint with the same secret as Vercel:

```powershell
$secret = "your-cron-secret"
Invoke-WebRequest `
  -Uri "http://localhost:3000/api/cron/ticket-sync" `
  -Headers @{ Authorization = "Bearer $secret" } |
  Select-Object -ExpandProperty Content
```

Expected shape:

```json
{
  "ok": true,
  "organizationId": "org_id",
  "since": "2026-05-01T00:00:00.000Z",
  "summaries": [
    { "source": "CONNECTWISE", "enabled": true, "fetched": 12, "upserted": 12, "errors": [] },
    { "source": "AUTOTASK", "enabled": false, "fetched": 0, "upserted": 0, "errors": [] }
  ]
}
```

## Tenant Isolation

Every app read is scoped by `organizationId`. The RLS policy allows authenticated users to read only tickets for their own organization:

```sql
USING (organization_id = public.requesting_org_id())
```

Authenticated users do not get INSERT, UPDATE, or DELETE policies for tickets. Writes should happen server-side from explicit integration sync jobs using privileged server credentials.

## Sync Contract

Future ConnectWise and Autotask sync jobs should upsert tickets with this uniqueness rule:

```txt
organizationId + source + externalId
```

Recommended mapping:

| Ticket field | Source meaning |
| --- | --- |
| `organizationId` | Current MSP tenant |
| `clientId` | Matched ClientPulse client, nullable if unmatched |
| `source` | `CONNECTWISE` or `AUTOTASK` |
| `externalId` | PSA ticket/service-call ID |
| `number` | Human-facing PSA ticket number |
| `title` | Ticket summary/title |
| `description` | Optional issue description |
| `status` | Normalized lifecycle status |
| `priority` | Normalized urgency |
| `assignee` | Technician/owner display name |
| `url` | Deep link to the source PSA ticket |
| `externalCreatedAt` | Source-created timestamp |
| `externalUpdatedAt` | Source-updated timestamp |
| `resolvedAt` | Source-resolved/closed timestamp |
| `syncedAt` | Time ClientPulse last synced the row |

## Health Scoring

Ticket data is not part of the health score yet. Once real syncs are running, add an `Open Ticket Backlog` component to `lib/health/score.ts` and rebalance component weights in `docs/health-scoring.md`.

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

## Future Inputs

The formula is designed for easy extension. To add a new component:

1. Add a weight constant to `score.ts` (and reduce existing weights so they still sum to 1.0).
2. Add the required field(s) to the `HealthInputs` interface.
3. Compute the component score and push it to the `components` array.
4. Update this document.

**Planned future components:**

| Component | Planned weight contribution | Data source |
|-----------|-----------------------------|-------------|
| Open ticket backlog | TBD | ConnectWise / Autotask integration |
| Backup success rate | TBD | Backup tool integration |
| SLA compliance | TBD | SLA tier vs. actual response metrics |

These components are intentionally absent until real data is available. The current 0.7/0.3 split reflects the only two data points we have today.

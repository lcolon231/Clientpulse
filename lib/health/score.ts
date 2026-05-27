/**
 * Health scoring engine — pure, deterministic, no side effects.
 *
 * Three weighted components (weights must sum to 1.0):
 *
 *   Patch Freshness  (weight 0.5)
 *     per-device: ≤30 days → 100 | 31–90 days → 50 | >90 days or null → 0
 *     component score = mean of per-device scores
 *
 *   Device Coverage  (weight 0.2)
 *     per-device: lastSeen within 30 days → 100 | stale/null → 0
 *     component score = (recently-seen count / total) × 100
 *
 *   Open Tickets     (weight 0.3)
 *     0 open → 100 | 1–2 → 75 | 3–5 → 50 | 6–10 → 25 | 11+ → 0
 */

// --- Weights (must sum to 1.0) ---
const PATCH_WEIGHT = 0.5
const COVERAGE_WEIGHT = 0.2
const TICKET_WEIGHT = 0.3

// --- Band thresholds ---
const HEALTHY_MIN = 85
const FAIR_MIN = 70
const AT_RISK_MIN = 50

// --- Sub-scoring thresholds ---
const PATCH_CURRENT_DAYS = 30
const PATCH_AGING_DAYS = 90
const SEEN_RECENT_DAYS = 30

export interface HealthInputs {
  deviceCount: number
  devices: { patchAgeDays: number | null; lastSeen: Date | null }[]
  openTicketCount?: number
}

export interface HealthComponent {
  name: string
  score: number
  weight: number
  detail: string
}

export interface HealthResult {
  score: number // 0–100, integer
  band: 'CRITICAL' | 'AT_RISK' | 'FAIR' | 'HEALTHY'
  components: HealthComponent[]
}

function toBand(score: number): HealthResult['band'] {
  if (score >= HEALTHY_MIN) return 'HEALTHY'
  if (score >= FAIR_MIN) return 'FAIR'
  if (score >= AT_RISK_MIN) return 'AT_RISK'
  return 'CRITICAL'
}

function devicePatchScore(patchAgeDays: number | null): number {
  if (patchAgeDays === null || patchAgeDays > PATCH_AGING_DAYS) return 0
  if (patchAgeDays <= PATCH_CURRENT_DAYS) return 100
  return 50 // 31–90 days: aging
}

function isRecentlySeen(lastSeen: Date | null): boolean {
  if (lastSeen === null) return false
  const msPerDay = 86_400_000
  return (Date.now() - lastSeen.getTime()) / msPerDay <= SEEN_RECENT_DAYS
}

function openTicketScore(openCount: number): number {
  if (openCount === 0) return 100
  if (openCount <= 2) return 75
  if (openCount <= 5) return 50
  if (openCount <= 10) return 25
  return 0
}

export function calculateHealth(inputs: HealthInputs): HealthResult {
  const { devices } = inputs
  const openTicketCount = inputs.openTicketCount ?? 0
  const tScore = openTicketScore(openTicketCount)

  const ticketComponent: HealthComponent = {
    name: 'Open Tickets',
    score: tScore,
    weight: TICKET_WEIGHT,
    detail: openTicketCount === 0
      ? 'No open tickets'
      : `${openTicketCount} open ticket${openTicketCount === 1 ? '' : 's'}`,
  }

  // Zero-device state: patch and coverage are unknown; score tickets normally.
  if (devices.length === 0) {
    const noDataDetail = 'No devices registered'
    const rawScore = 75 * PATCH_WEIGHT + 75 * COVERAGE_WEIGHT + tScore * TICKET_WEIGHT
    return {
      score: Math.round(rawScore),
      band: toBand(Math.round(rawScore)),
      components: [
        { name: 'Patch Freshness', score: 75, weight: PATCH_WEIGHT, detail: noDataDetail },
        { name: 'Device Coverage', score: 75, weight: COVERAGE_WEIGHT, detail: noDataDetail },
        ticketComponent,
      ],
    }
  }

  // Patch Freshness
  const patchScores = devices.map(d => devicePatchScore(d.patchAgeDays))
  const patchMean = patchScores.reduce((a, b) => a + b, 0) / devices.length

  const currentCount = devices.filter(
    d => d.patchAgeDays !== null && d.patchAgeDays <= PATCH_CURRENT_DAYS
  ).length
  const agingCount = devices.filter(
    d =>
      d.patchAgeDays !== null &&
      d.patchAgeDays > PATCH_CURRENT_DAYS &&
      d.patchAgeDays <= PATCH_AGING_DAYS
  ).length
  const staleCount = devices.length - currentCount - agingCount

  const patchComponent: HealthComponent = {
    name: 'Patch Freshness',
    score: Math.round(patchMean),
    weight: PATCH_WEIGHT,
    detail: `${currentCount} current, ${agingCount} aging (31–90 days), ${staleCount} stale/unknown (>90 days or no data)`,
  }

  // Device Coverage
  const recentCount = devices.filter(d => isRecentlySeen(d.lastSeen)).length
  const coverageMean = (recentCount / devices.length) * 100

  const coverageComponent: HealthComponent = {
    name: 'Device Coverage',
    score: Math.round(coverageMean),
    weight: COVERAGE_WEIGHT,
    detail: `${recentCount} of ${devices.length} devices seen in the last ${SEEN_RECENT_DAYS} days`,
  }

  const rawScore = patchMean * PATCH_WEIGHT + coverageMean * COVERAGE_WEIGHT + tScore * TICKET_WEIGHT
  const score = Math.round(rawScore)

  return {
    score,
    band: toBand(score),
    components: [patchComponent, coverageComponent, ticketComponent],
  }
}

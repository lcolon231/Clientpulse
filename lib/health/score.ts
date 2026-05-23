/**
 * Health scoring engine — pure, deterministic, no side effects.
 *
 * Two weighted components today (weights must sum to 1.0):
 *
 *   Patch Freshness  (weight 0.7)
 *     per-device: ≤30 days → 100 | 31–90 days → 50 | >90 days or null → 0
 *     component score = mean of per-device scores
 *
 *   Device Coverage  (weight 0.3)
 *     per-device: lastSeen within 30 days → 100 | stale/null → 0
 *     component score = (recently-seen count / total) × 100
 *
 *   Total = Σ(component.score × component.weight), rounded to integer.
 *
 * Adding a future component (e.g. backup success, open ticket count):
 *   1. Add a weight constant and reduce existing weights so they sum to 1.0.
 *   2. Add its field(s) to HealthInputs.
 *   3. Compute its component score and push it to the components array.
 */

// --- Weights (must sum to 1.0) ---
const PATCH_WEIGHT = 0.7
const COVERAGE_WEIGHT = 0.3

// --- Band thresholds ---
const HEALTHY_MIN = 85
const FAIR_MIN = 70
const AT_RISK_MIN = 50

// --- Sub-scoring thresholds ---
const PATCH_CURRENT_DAYS = 30 // ≤ this: fully current
const PATCH_AGING_DAYS = 90 // ≤ this (and > CURRENT): aging, partial credit
const SEEN_RECENT_DAYS = 30 // lastSeen within this many days: device is reporting

export interface HealthInputs {
  deviceCount: number
  devices: { patchAgeDays: number | null; lastSeen: Date | null }[]
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

export function calculateHealth(inputs: HealthInputs): HealthResult {
  const { devices } = inputs

  // Zero-device state: no data to score — represent as neutral FAIR (75).
  // A client with no devices is neither healthy nor actively failing; returning
  // FAIR communicates "unknown" without penalising a new or transitioning client.
  if (devices.length === 0) {
    const noDataDetail = 'No devices registered'
    return {
      score: 75,
      band: 'FAIR',
      components: [
        { name: 'Patch Freshness', score: 75, weight: PATCH_WEIGHT, detail: noDataDetail },
        { name: 'Device Coverage', score: 75, weight: COVERAGE_WEIGHT, detail: noDataDetail },
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

  const rawScore = patchMean * PATCH_WEIGHT + coverageMean * COVERAGE_WEIGHT
  const score = Math.round(rawScore)

  return {
    score,
    band: toBand(score),
    components: [patchComponent, coverageComponent],
  }
}

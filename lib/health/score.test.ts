import { describe, it, expect } from 'vitest'
import { calculateHealth } from './score'

// Weights: PATCH=0.5, COVERAGE=0.2, TICKET=0.3
// ticketScore: 0 open=100, 1-2=75, 3-5=50, 6-10=25, 11+=0

const now = new Date()
const staleDate = new Date(Date.now() - 60 * 86_400_000) // 60 days ago

describe('calculateHealth', () => {
  it('returns HEALTHY for all-fresh, all-recently-seen, 0 open tickets', () => {
    const result = calculateHealth({
      deviceCount: 3,
      devices: [
        { patchAgeDays: 5, lastSeen: now },
        { patchAgeDays: 10, lastSeen: now },
        { patchAgeDays: 25, lastSeen: now },
      ],
      openTicketCount: 0,
    })
    // patch: 100*0.5=50, coverage: 100*0.2=20, tickets: 100*0.3=30 → 100
    expect(result.score).toBe(100)
    expect(result.band).toBe('HEALTHY')
  })

  it('returns CRITICAL for all-stale devices with 0 open tickets', () => {
    const result = calculateHealth({
      deviceCount: 3,
      devices: [
        { patchAgeDays: 120, lastSeen: staleDate },
        { patchAgeDays: 200, lastSeen: null },
        { patchAgeDays: 95, lastSeen: staleDate },
      ],
      openTicketCount: 0,
    })
    // patch: 0*0.5=0, coverage: 0*0.2=0, tickets: 100*0.3=30 → 30 → CRITICAL
    expect(result.score).toBe(30)
    expect(result.band).toBe('CRITICAL')
  })

  it('handles mixed devices — half fresh/recent, half stale, 0 open tickets', () => {
    const result = calculateHealth({
      deviceCount: 4,
      devices: [
        { patchAgeDays: 10, lastSeen: now },
        { patchAgeDays: 15, lastSeen: now },
        { patchAgeDays: 100, lastSeen: staleDate },
        { patchAgeDays: 150, lastSeen: null },
      ],
      openTicketCount: 0,
    })
    // patch: (100+100+0+0)/4=50 → 50*0.5=25
    // coverage: 2/4=50 → 50*0.2=10
    // tickets: 100*0.3=30
    // total: 65 → AT_RISK
    expect(result.score).toBe(65)
    expect(result.band).toBe('AT_RISK')
  })

  it('returns FAIR with 0 open tickets and no devices', () => {
    const result = calculateHealth({ deviceCount: 0, devices: [], openTicketCount: 0 })
    // 75*0.5 + 75*0.2 + 100*0.3 = 37.5+15+30 = 82.5 → 83
    expect(result.score).toBe(83)
    expect(result.band).toBe('FAIR')
    expect(result.components[0].detail).toMatch(/no devices/i)
  })

  it('zero devices + 11 open tickets scores as AT_RISK', () => {
    const result = calculateHealth({ deviceCount: 0, devices: [], openTicketCount: 11 })
    // 75*0.5 + 75*0.2 + 0*0.3 = 37.5+15+0 = 52.5 → 53 → AT_RISK
    expect(result.score).toBe(53)
    expect(result.band).toBe('AT_RISK')
  })

  it('treats null patchAgeDays as stale (score 0 for that device)', () => {
    const result = calculateHealth({
      deviceCount: 2,
      devices: [
        { patchAgeDays: null, lastSeen: now },
        { patchAgeDays: null, lastSeen: now },
      ],
      openTicketCount: 0,
    })
    // patch: 0*0.5=0, coverage: 100*0.2=20, tickets: 100*0.3=30 → 50 → AT_RISK
    expect(result.score).toBe(50)
    expect(result.band).toBe('AT_RISK')
  })

  it('gives partial credit (50 pts) to aging devices (31–90 days)', () => {
    const result = calculateHealth({
      deviceCount: 1,
      devices: [{ patchAgeDays: 60, lastSeen: now }],
      openTicketCount: 0,
    })
    // patch: 50*0.5=25, coverage: 100*0.2=20, tickets: 100*0.3=30 → 75 → FAIR
    expect(result.score).toBe(75)
    expect(result.band).toBe('FAIR')
  })

  it('open tickets (1–2) reduce score to 75 ticket component', () => {
    const result = calculateHealth({
      deviceCount: 1,
      devices: [{ patchAgeDays: 10, lastSeen: now }],
      openTicketCount: 2,
    })
    // patch: 100*0.5=50, coverage: 100*0.2=20, tickets: 75*0.3=22.5 → 92.5 → 93 → HEALTHY
    expect(result.score).toBe(93)
    expect(result.band).toBe('HEALTHY')
  })

  it('open tickets (6–10) heavily penalise score', () => {
    const result = calculateHealth({
      deviceCount: 1,
      devices: [{ patchAgeDays: 10, lastSeen: now }],
      openTicketCount: 8,
    })
    // patch: 50, coverage: 20, tickets: 25*0.3=7.5 → 77.5 → 78 → FAIR
    expect(result.score).toBe(78)
    expect(result.band).toBe('FAIR')
  })

  it('11+ open tickets yield 0 ticket score', () => {
    const result = calculateHealth({
      deviceCount: 1,
      devices: [{ patchAgeDays: 10, lastSeen: now }],
      openTicketCount: 12,
    })
    // patch: 50, coverage: 20, tickets: 0*0.3=0 → 70 → FAIR
    expect(result.score).toBe(70)
    expect(result.band).toBe('FAIR')
  })

  it('boundary: patchAgeDays = 30 is current (100 pts)', () => {
    const result = calculateHealth({
      deviceCount: 1,
      devices: [{ patchAgeDays: 30, lastSeen: now }],
      openTicketCount: 0,
    })
    expect(result.score).toBe(100)
    expect(result.band).toBe('HEALTHY')
  })

  it('boundary: patchAgeDays = 31 is aging (50 pts patch)', () => {
    const result = calculateHealth({
      deviceCount: 1,
      devices: [{ patchAgeDays: 31, lastSeen: now }],
      openTicketCount: 0,
    })
    // patch: 50*0.5=25, coverage: 100*0.2=20, tickets: 100*0.3=30 → 75 → FAIR
    expect(result.score).toBe(75)
    expect(result.band).toBe('FAIR')
  })

  it('boundary: patchAgeDays = 91 is stale (0 pts patch)', () => {
    const result = calculateHealth({
      deviceCount: 1,
      devices: [{ patchAgeDays: 91, lastSeen: now }],
      openTicketCount: 0,
    })
    // patch: 0*0.5=0, coverage: 100*0.2=20, tickets: 100*0.3=30 → 50 → AT_RISK
    expect(result.score).toBe(50)
    expect(result.band).toBe('AT_RISK')
  })

  it('detail string counts current / aging / stale correctly', () => {
    const result = calculateHealth({
      deviceCount: 3,
      devices: [
        { patchAgeDays: 10, lastSeen: now }, // current
        { patchAgeDays: 60, lastSeen: now }, // aging
        { patchAgeDays: 110, lastSeen: null }, // stale/unknown
      ],
      openTicketCount: 3,
    })
    const patch = result.components.find(c => c.name === 'Patch Freshness')!
    expect(patch.detail).toContain('1 current')
    expect(patch.detail).toContain('1 aging')
    expect(patch.detail).toContain('1 stale/unknown')
  })

  it('returns three components with correct weights (0.5, 0.2, 0.3)', () => {
    const result = calculateHealth({
      deviceCount: 1,
      devices: [{ patchAgeDays: 10, lastSeen: now }],
      openTicketCount: 0,
    })
    const weights = result.components.map(c => c.weight)
    expect(weights).toContain(0.5)
    expect(weights).toContain(0.2)
    expect(weights).toContain(0.3)
    expect(result.components).toHaveLength(3)
  })

  it('openTicketCount defaults to 0 when omitted', () => {
    const withZero = calculateHealth({
      deviceCount: 1,
      devices: [{ patchAgeDays: 10, lastSeen: now }],
      openTicketCount: 0,
    })
    const withOmitted = calculateHealth({
      deviceCount: 1,
      devices: [{ patchAgeDays: 10, lastSeen: now }],
    })
    expect(withOmitted.score).toBe(withZero.score)
    expect(withOmitted.band).toBe(withZero.band)
  })
})

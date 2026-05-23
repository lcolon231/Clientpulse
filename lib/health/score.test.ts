import { describe, it, expect } from 'vitest'
import { calculateHealth } from './score'

const now = new Date()
const staleDate = new Date(Date.now() - 60 * 86_400_000) // 60 days ago

describe('calculateHealth', () => {
  it('returns HEALTHY for all-fresh, all-recently-seen devices', () => {
    const result = calculateHealth({
      deviceCount: 3,
      devices: [
        { patchAgeDays: 5, lastSeen: now },
        { patchAgeDays: 10, lastSeen: now },
        { patchAgeDays: 25, lastSeen: now },
      ],
    })
    // patch: (100+100+100)/3 = 100, coverage: 3/3 = 100
    // score: 100*0.7 + 100*0.3 = 100
    expect(result.score).toBe(100)
    expect(result.band).toBe('HEALTHY')
  })

  it('returns CRITICAL for all-stale devices', () => {
    const result = calculateHealth({
      deviceCount: 3,
      devices: [
        { patchAgeDays: 120, lastSeen: staleDate },
        { patchAgeDays: 200, lastSeen: null },
        { patchAgeDays: 95, lastSeen: staleDate },
      ],
    })
    // patch: 0, coverage: 0 → score: 0
    expect(result.score).toBe(0)
    expect(result.band).toBe('CRITICAL')
  })

  it('handles mixed devices — half fresh/recent, half stale', () => {
    const result = calculateHealth({
      deviceCount: 4,
      devices: [
        { patchAgeDays: 10, lastSeen: now },
        { patchAgeDays: 15, lastSeen: now },
        { patchAgeDays: 100, lastSeen: staleDate },
        { patchAgeDays: 150, lastSeen: null },
      ],
    })
    // patch: (100+100+0+0)/4 = 50, coverage: 2/4 = 50
    // score: 50*0.7 + 50*0.3 = 50 → AT_RISK
    expect(result.score).toBe(50)
    expect(result.band).toBe('AT_RISK')
  })

  it('returns FAIR with score 75 for zero devices', () => {
    const result = calculateHealth({ deviceCount: 0, devices: [] })
    expect(result.score).toBe(75)
    expect(result.band).toBe('FAIR')
    expect(result.components[0].detail).toMatch(/no devices/i)
    expect(result.components[1].detail).toMatch(/no devices/i)
  })

  it('treats null patchAgeDays as stale (score 0 for that device)', () => {
    const result = calculateHealth({
      deviceCount: 2,
      devices: [
        { patchAgeDays: null, lastSeen: now },
        { patchAgeDays: null, lastSeen: now },
      ],
    })
    // patch: 0, coverage: 100 → score: 0*0.7 + 100*0.3 = 30 → CRITICAL
    expect(result.score).toBe(30)
    expect(result.band).toBe('CRITICAL')
  })

  it('gives partial credit (50 pts) to aging devices (31–90 days)', () => {
    const result = calculateHealth({
      deviceCount: 1,
      devices: [{ patchAgeDays: 60, lastSeen: now }],
    })
    // patch: 50*0.7 = 35, coverage: 100*0.3 = 30 → score: 65 → AT_RISK
    expect(result.score).toBe(65)
    expect(result.band).toBe('AT_RISK')
  })

  it('boundary: patchAgeDays = 30 is current (100 pts)', () => {
    const result = calculateHealth({
      deviceCount: 1,
      devices: [{ patchAgeDays: 30, lastSeen: now }],
    })
    expect(result.score).toBe(100)
    expect(result.band).toBe('HEALTHY')
  })

  it('boundary: patchAgeDays = 31 is aging (50 pts)', () => {
    const result = calculateHealth({
      deviceCount: 1,
      devices: [{ patchAgeDays: 31, lastSeen: now }],
    })
    // patch: 50*0.7 = 35, coverage: 100*0.3 = 30 → 65 → AT_RISK
    expect(result.score).toBe(65)
    expect(result.band).toBe('AT_RISK')
  })

  it('boundary: patchAgeDays = 90 is aging (50 pts)', () => {
    const result = calculateHealth({
      deviceCount: 1,
      devices: [{ patchAgeDays: 90, lastSeen: now }],
    })
    expect(result.score).toBe(65)
    expect(result.band).toBe('AT_RISK')
  })

  it('boundary: patchAgeDays = 91 is stale (0 pts)', () => {
    const result = calculateHealth({
      deviceCount: 1,
      devices: [{ patchAgeDays: 91, lastSeen: now }],
    })
    // patch: 0*0.7 = 0, coverage: 100*0.3 = 30 → 30 → CRITICAL
    expect(result.score).toBe(30)
    expect(result.band).toBe('CRITICAL')
  })

  it('detail string counts current / aging / stale correctly', () => {
    const result = calculateHealth({
      deviceCount: 3,
      devices: [
        { patchAgeDays: 10, lastSeen: now }, // current
        { patchAgeDays: 60, lastSeen: now }, // aging
        { patchAgeDays: 110, lastSeen: null }, // stale/unknown
      ],
    })
    const patch = result.components.find(c => c.name === 'Patch Freshness')!
    expect(patch.detail).toContain('1 current')
    expect(patch.detail).toContain('1 aging')
    expect(patch.detail).toContain('1 stale/unknown')
  })

  it('returns two components with correct weights', () => {
    const result = calculateHealth({
      deviceCount: 1,
      devices: [{ patchAgeDays: 10, lastSeen: now }],
    })
    const weights = result.components.map(c => c.weight)
    expect(weights).toContain(0.7)
    expect(weights).toContain(0.3)
  })
})

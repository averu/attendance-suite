import { describe, it, expect } from 'vitest'
import { lookupPaidLeaveDays } from './paidLeaveGrantTable'

describe('lookupPaidLeaveDays — 一般労働者', () => {
  const regular = { weeklyScheduledDays: 5, weeklyScheduledHours: 40 }

  it('0.5y 未満 → 0 (付与対象外)', () => {
    expect(lookupPaidLeaveDays({ ...regular, yearsOfService: 0 })).toBe(0)
    expect(lookupPaidLeaveDays({ ...regular, yearsOfService: 0.4 })).toBe(0)
  })

  it('0.5y → 10', () => {
    expect(lookupPaidLeaveDays({ ...regular, yearsOfService: 0.5 })).toBe(10)
  })

  it('1.5y → 11', () => {
    expect(lookupPaidLeaveDays({ ...regular, yearsOfService: 1.5 })).toBe(11)
  })

  it('2.5y → 12', () => {
    expect(lookupPaidLeaveDays({ ...regular, yearsOfService: 2.5 })).toBe(12)
  })

  it('3.5y → 14', () => {
    expect(lookupPaidLeaveDays({ ...regular, yearsOfService: 3.5 })).toBe(14)
  })

  it('4.5y → 16', () => {
    expect(lookupPaidLeaveDays({ ...regular, yearsOfService: 4.5 })).toBe(16)
  })

  it('5.5y → 18', () => {
    expect(lookupPaidLeaveDays({ ...regular, yearsOfService: 5.5 })).toBe(18)
  })

  it('6.5y / 10y / 30y → 20 (上限)', () => {
    expect(lookupPaidLeaveDays({ ...regular, yearsOfService: 6.5 })).toBe(20)
    expect(lookupPaidLeaveDays({ ...regular, yearsOfService: 10 })).toBe(20)
    expect(lookupPaidLeaveDays({ ...regular, yearsOfService: 30 })).toBe(20)
  })

  it('週 30h+ なら週 4 日でも一般扱い', () => {
    expect(
      lookupPaidLeaveDays({
        yearsOfService: 0.5,
        weeklyScheduledDays: 4,
        weeklyScheduledHours: 32,
      }),
    ).toBe(10)
  })

  it('週 5 日なら 30h 未満でも一般扱い', () => {
    expect(
      lookupPaidLeaveDays({
        yearsOfService: 0.5,
        weeklyScheduledDays: 5,
        weeklyScheduledHours: 25,
      }),
    ).toBe(10)
  })
})

describe('lookupPaidLeaveDays — 比例付与', () => {
  it('週 4 日 / 25h: 0.5y → 7, 1.5y → 8, 6.5y → 15', () => {
    const base = { weeklyScheduledDays: 4, weeklyScheduledHours: 25 }
    expect(lookupPaidLeaveDays({ ...base, yearsOfService: 0.5 })).toBe(7)
    expect(lookupPaidLeaveDays({ ...base, yearsOfService: 1.5 })).toBe(8)
    expect(lookupPaidLeaveDays({ ...base, yearsOfService: 6.5 })).toBe(15)
  })

  it('週 3 日 / 20h: 0.5y → 5, 6.5y → 11', () => {
    const base = { weeklyScheduledDays: 3, weeklyScheduledHours: 20 }
    expect(lookupPaidLeaveDays({ ...base, yearsOfService: 0.5 })).toBe(5)
    expect(lookupPaidLeaveDays({ ...base, yearsOfService: 6.5 })).toBe(11)
  })

  it('週 2 日 / 15h: 0.5y → 3, 6.5y → 7', () => {
    const base = { weeklyScheduledDays: 2, weeklyScheduledHours: 15 }
    expect(lookupPaidLeaveDays({ ...base, yearsOfService: 0.5 })).toBe(3)
    expect(lookupPaidLeaveDays({ ...base, yearsOfService: 6.5 })).toBe(7)
  })

  it('週 1 日 / 8h: 0.5y → 1, 6.5y → 3', () => {
    const base = { weeklyScheduledDays: 1, weeklyScheduledHours: 8 }
    expect(lookupPaidLeaveDays({ ...base, yearsOfService: 0.5 })).toBe(1)
    expect(lookupPaidLeaveDays({ ...base, yearsOfService: 6.5 })).toBe(3)
  })

  it('週 0 日 (= 付与対象外) → 0', () => {
    expect(
      lookupPaidLeaveDays({
        yearsOfService: 0.5,
        weeklyScheduledDays: 0,
        weeklyScheduledHours: 0,
      }),
    ).toBe(0)
  })
})

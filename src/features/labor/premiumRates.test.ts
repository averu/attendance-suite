import { describe, it, expect } from 'vitest'
import {
  computePremiumRate,
  LATE_NIGHT_PREMIUM,
  LEGAL_HOLIDAY_PREMIUM,
  LEGAL_OVERTIME_PREMIUM,
  OVER_60H_OVERTIME_PREMIUM,
} from './premiumRates'

describe('premium rate constants', () => {
  it('労基法 37 条の最低割増率を満たす', () => {
    expect(LEGAL_OVERTIME_PREMIUM).toBeCloseTo(0.25)
    expect(OVER_60H_OVERTIME_PREMIUM).toBeCloseTo(0.5)
    expect(LATE_NIGHT_PREMIUM).toBeCloseTo(0.25)
    expect(LEGAL_HOLIDAY_PREMIUM).toBeCloseTo(0.35)
  })
})

describe('computePremiumRate', () => {
  const base = {
    isLegalOvertime: false,
    isOver60hLegalOvertime: false,
    isLateNight: false,
    isLegalHoliday: false,
  }

  it('該当なし → 0', () => {
    expect(computePremiumRate(base)).toBe(0)
  })

  it('法定外残業のみ → 25%', () => {
    expect(
      computePremiumRate({ ...base, isLegalOvertime: true }),
    ).toBeCloseTo(0.25)
  })

  it('法定外残業 + 深夜 → 50%', () => {
    expect(
      computePremiumRate({ ...base, isLegalOvertime: true, isLateNight: true }),
    ).toBeCloseTo(0.5)
  })

  it('月 60h 超 法定外残業 → 50%', () => {
    expect(
      computePremiumRate({
        ...base,
        isLegalOvertime: true,
        isOver60hLegalOvertime: true,
      }),
    ).toBeCloseTo(0.5)
  })

  it('月 60h 超 法定外残業 + 深夜 → 75%', () => {
    expect(
      computePremiumRate({
        ...base,
        isLegalOvertime: true,
        isOver60hLegalOvertime: true,
        isLateNight: true,
      }),
    ).toBeCloseTo(0.75)
  })

  it('法定休日労働のみ → 35% (60h ルールは適用外)', () => {
    expect(
      computePremiumRate({
        ...base,
        isLegalHoliday: true,
        isLegalOvertime: true, // 設定されていても無視されるべき
        isOver60hLegalOvertime: true,
      }),
    ).toBeCloseTo(0.35)
  })

  it('法定休日労働 + 深夜 → 60%', () => {
    expect(
      computePremiumRate({
        ...base,
        isLegalHoliday: true,
        isLateNight: true,
      }),
    ).toBeCloseTo(0.6)
  })

  it('深夜のみ (法定内) → 25%', () => {
    expect(
      computePremiumRate({ ...base, isLateNight: true }),
    ).toBeCloseTo(0.25)
  })
})

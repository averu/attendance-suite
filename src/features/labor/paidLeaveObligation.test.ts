import { describe, it, expect } from 'vitest'
import { checkAnnualPaidLeaveObligation } from './paidLeaveObligation'
import type { LeaveGrant } from './paidLeaveGrant'

const grant = (
  grantDate: string,
  grantedDays: number,
  yearsOfService = 0.5,
): LeaveGrant => ({
  grantDate,
  yearsOfService,
  grantedDays,
  withheldFor80PctRule: false,
})

describe('checkAnnualPaidLeaveObligation', () => {
  it('10 日未満付与は対象外 (findings に出ない)', () => {
    const r = checkAnnualPaidLeaveObligation(
      [grant('2025-10-01', 7, 0.5)], // 比例付与で 10 日未満
      [],
      '2026-04-29',
    )
    expect(r).toEqual([])
  })

  it('10 日付与・期間内 5 日取得済 → compliant', () => {
    const r = checkAnnualPaidLeaveObligation(
      [grant('2025-10-01', 10)],
      [
        { date: '2025-12-01', days: 2 },
        { date: '2026-02-01', days: 3 },
      ],
      '2026-04-29',
    )
    expect(r[0]?.takenDays).toBe(5)
    expect(r[0]?.status).toBe('compliant')
  })

  it('10 日付与・期間進行中で 4 日のみ → pending', () => {
    const r = checkAnnualPaidLeaveObligation(
      [grant('2025-10-01', 10)],
      [{ date: '2026-02-01', days: 4 }],
      '2026-04-29', // 期間 = 2025-10-01 ~ 2026-10-01、進行中
    )
    expect(r[0]?.takenDays).toBe(4)
    expect(r[0]?.isPeriodEnded).toBe(false)
    expect(r[0]?.status).toBe('pending')
  })

  it('10 日付与・期間終了で 4 日のみ → violation', () => {
    const r = checkAnnualPaidLeaveObligation(
      [grant('2024-10-01', 10)],
      [{ date: '2025-02-01', days: 4 }],
      '2026-04-29',
    )
    expect(r[0]?.takenDays).toBe(4)
    expect(r[0]?.isPeriodEnded).toBe(true)
    expect(r[0]?.status).toBe('violation')
  })

  it('期間外の取得 (前後の usage) はカウントされない', () => {
    const r = checkAnnualPaidLeaveObligation(
      [grant('2025-10-01', 10)],
      [
        { date: '2025-09-15', days: 5 }, // 付与前
        { date: '2026-10-15', days: 5 }, // 期間後
      ],
      '2027-04-29',
    )
    expect(r[0]?.takenDays).toBe(0)
    expect(r[0]?.status).toBe('violation')
  })

  it('複数付与: 各期間で独立に判定', () => {
    const r = checkAnnualPaidLeaveObligation(
      [grant('2024-10-01', 10), grant('2025-10-01', 11, 1.5)],
      [
        { date: '2025-01-01', days: 5 }, // 1 つ目期間: 5 日取得 → compliant
        { date: '2026-01-01', days: 4 }, // 2 つ目期間: 4 日のみで進行中 → pending
      ],
      '2026-04-29',
    )
    expect(r[0]?.status).toBe('compliant') // 1st period (2024-10 ~ 2025-10)
    expect(r[1]?.status).toBe('pending') // 2nd period (2025-10 ~ 2026-10), 進行中
  })

  it('5 日ぴったりは compliant', () => {
    const r = checkAnnualPaidLeaveObligation(
      [grant('2025-10-01', 10)],
      [{ date: '2026-01-01', days: 5 }],
      '2026-04-29',
    )
    expect(r[0]?.status).toBe('compliant')
  })
})

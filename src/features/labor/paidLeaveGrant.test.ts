import { describe, it, expect } from 'vitest'
import {
  computeGrantDates,
  computePaidLeaveGrants,
} from './paidLeaveGrant'

const regular = { weeklyScheduledDays: 5, weeklyScheduledHours: 40 }

describe('computeGrantDates', () => {
  it('asOfDate が 6 ヶ月未満 → 空', () => {
    expect(
      computeGrantDates('2025-04-01', '2025-09-30'),
    ).toEqual([])
  })

  it('6 ヶ月ぴったりで初回付与', () => {
    expect(computeGrantDates('2025-04-01', '2025-10-01')).toEqual([
      { grantDate: '2025-10-01', yearsOfService: 0.5 },
    ])
  })

  it('1.5 年経過で 2 回付与', () => {
    expect(computeGrantDates('2025-04-01', '2026-10-01')).toEqual([
      { grantDate: '2025-10-01', yearsOfService: 0.5 },
      { grantDate: '2026-10-01', yearsOfService: 1.5 },
    ])
  })

  it('hireDate が月末で +6m が短い月 → クランプ', () => {
    // 2025-08-31 + 6m → 2026-02-28
    const dates = computeGrantDates('2025-08-31', '2026-02-28')
    expect(dates).toEqual([{ grantDate: '2026-02-28', yearsOfService: 0.5 }])
  })

  it('7 年勤続: 6.5y で頭打ちにならず yearsOfService が増え続ける', () => {
    const dates = computeGrantDates('2018-04-01', '2026-04-01')
    expect(dates.length).toBeGreaterThanOrEqual(7)
    const last = dates[dates.length - 1]!
    expect(last.yearsOfService).toBeGreaterThanOrEqual(6.5)
  })
})

describe('computePaidLeaveGrants', () => {
  it('一般労働者 1.5 年経過 → 10, 11 の 2 回付与', () => {
    const grants = computePaidLeaveGrants(
      { ...regular, hireDate: '2025-04-01' },
      '2026-10-01',
    )
    expect(grants).toEqual([
      {
        grantDate: '2025-10-01',
        yearsOfService: 0.5,
        grantedDays: 10,
        withheldFor80PctRule: false,
      },
      {
        grantDate: '2026-10-01',
        yearsOfService: 1.5,
        grantedDays: 11,
        withheldFor80PctRule: false,
      },
    ])
  })

  it('出勤率 0.79 の付与日は 0 日 + withheld フラグ', () => {
    const grants = computePaidLeaveGrants(
      { ...regular, hireDate: '2025-04-01' },
      '2026-10-01',
      { '2026-10-01': 0.79 },
    )
    expect(grants[0]?.grantedDays).toBe(10)
    expect(grants[1]).toMatchObject({
      grantedDays: 0,
      withheldFor80PctRule: true,
    })
  })

  it('出勤率 0.8 ぴったりは付与', () => {
    const grants = computePaidLeaveGrants(
      { ...regular, hireDate: '2025-04-01' },
      '2025-10-01',
      { '2025-10-01': 0.8 },
    )
    expect(grants[0]?.grantedDays).toBe(10)
    expect(grants[0]?.withheldFor80PctRule).toBe(false)
  })

  it('比例付与 (週 3 日, 20h) で 0.5y → 5 日付与', () => {
    const grants = computePaidLeaveGrants(
      {
        hireDate: '2025-04-01',
        weeklyScheduledDays: 3,
        weeklyScheduledHours: 20,
      },
      '2025-10-01',
    )
    expect(grants[0]?.grantedDays).toBe(5)
  })
})

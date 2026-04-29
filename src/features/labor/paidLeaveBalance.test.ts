import { describe, it, expect } from 'vitest'
import { computeLeaveBalance } from './paidLeaveBalance'
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

describe('computeLeaveBalance — 基本', () => {
  it('付与なし・取得なし → 残 0', () => {
    const r = computeLeaveBalance([], [], '2026-04-29')
    expect(r.totalGrantedActiveDays).toBe(0)
    expect(r.totalUsedDays).toBe(0)
    expect(r.remainingDays).toBe(0)
  })

  it('10 日付与・0 日取得 → 残 10', () => {
    const r = computeLeaveBalance(
      [grant('2025-10-01', 10)],
      [],
      '2026-04-29',
    )
    expect(r.remainingDays).toBe(10)
    expect(r.totalUsedDays).toBe(0)
  })

  it('10 日付与・3 日取得 → 残 7', () => {
    const r = computeLeaveBalance(
      [grant('2025-10-01', 10)],
      [
        { date: '2026-01-15', days: 1 },
        { date: '2026-02-10', days: 2 },
      ],
      '2026-04-29',
    )
    expect(r.totalUsedDays).toBe(3)
    expect(r.remainingDays).toBe(7)
  })

  it('半休 (0.5) も合算される', () => {
    const r = computeLeaveBalance(
      [grant('2025-10-01', 10)],
      [
        { date: '2026-01-15', days: 0.5 },
        { date: '2026-01-20', days: 0.5 },
      ],
      '2026-04-29',
    )
    expect(r.totalUsedDays).toBe(1)
    expect(r.remainingDays).toBe(9)
  })
})

describe('computeLeaveBalance — 2 年時効', () => {
  it('付与から 2 年後の同日は時効 (expiresAt <= asOfDate)', () => {
    const r = computeLeaveBalance(
      [grant('2024-10-01', 10)],
      [],
      '2026-10-01',
    )
    expect(r.grants[0]?.isExpired).toBe(true)
    expect(r.remainingDays).toBe(0)
    expect(r.totalGrantedActiveDays).toBe(0)
  })

  it('付与から 2 年後の前日は未時効', () => {
    const r = computeLeaveBalance(
      [grant('2024-10-01', 10)],
      [],
      '2026-09-30',
    )
    expect(r.grants[0]?.isExpired).toBe(false)
    expect(r.remainingDays).toBe(10)
  })

  it('時効済の取得 (期限後の usage) は消化されず unallocatedUsedDays に記録', () => {
    const r = computeLeaveBalance(
      [grant('2024-01-01', 10)],
      [{ date: '2026-02-01', days: 3 }], // expiresAt = 2026-01-01、その後の取得は不可
      '2026-04-29',
    )
    expect(r.unallocatedUsedDays).toBe(3)
    expect(r.totalUsedDays).toBe(0)
  })
})

describe('computeLeaveBalance — FIFO 消化', () => {
  it('複数付与は古い順に消化される', () => {
    const r = computeLeaveBalance(
      [grant('2025-04-01', 10), grant('2026-04-01', 11, 1.5)],
      [{ date: '2026-04-15', days: 12 }],
      '2026-04-29',
    )
    // 2025-04-01 grant: 10 日全消費
    // 2026-04-01 grant: 11 日中 2 日消費 → 残 9
    expect(r.grants[0]?.usedDays).toBe(10)
    expect(r.grants[0]?.remainingDays).toBe(0)
    expect(r.grants[1]?.usedDays).toBe(2)
    expect(r.grants[1]?.remainingDays).toBe(9)
    expect(r.remainingDays).toBe(9)
    expect(r.totalUsedDays).toBe(12)
  })

  it('付与日より前の取得は消化対象外', () => {
    const r = computeLeaveBalance(
      [grant('2025-10-01', 10)],
      [{ date: '2025-09-15', days: 1 }], // grant より前
      '2026-04-29',
    )
    expect(r.totalUsedDays).toBe(0)
    expect(r.unallocatedUsedDays).toBe(1)
    expect(r.remainingDays).toBe(10)
  })

  it('取得が残高を超えた場合 unallocatedUsedDays に積まれる', () => {
    const r = computeLeaveBalance(
      [grant('2025-10-01', 5)],
      [{ date: '2026-01-01', days: 8 }],
      '2026-04-29',
    )
    expect(r.totalUsedDays).toBe(5)
    expect(r.unallocatedUsedDays).toBe(3)
    expect(r.remainingDays).toBe(0)
  })
})

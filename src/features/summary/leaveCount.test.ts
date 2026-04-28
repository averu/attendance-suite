import { describe, expect, it } from 'vitest'
import { countLeaveDaysInMonth, type ApprovedLeaveSlice } from './leaveCount'

describe('countLeaveDaysInMonth', () => {
  it('空配列なら 0 / 0', () => {
    expect(countLeaveDaysInMonth([], '2026-04')).toEqual({
      paidLeaveDays: 0,
      otherLeaveDays: 0,
    })
  })

  it('paid_full 単日は paid 1 日', () => {
    const r = countLeaveDaysInMonth(
      [{ leaveType: 'paid_full', startDate: '2026-04-15', endDate: '2026-04-15' }],
      '2026-04',
    )
    expect(r).toEqual({ paidLeaveDays: 1, otherLeaveDays: 0 })
  })

  it('paid_half_am は 0.5 日 (paid)', () => {
    const r = countLeaveDaysInMonth(
      [{ leaveType: 'paid_half_am', startDate: '2026-04-15', endDate: '2026-04-15' }],
      '2026-04',
    )
    expect(r).toEqual({ paidLeaveDays: 0.5, otherLeaveDays: 0 })
  })

  it('paid_half_pm も 0.5 日 (paid)', () => {
    const r = countLeaveDaysInMonth(
      [{ leaveType: 'paid_half_pm', startDate: '2026-04-15', endDate: '2026-04-15' }],
      '2026-04',
    )
    expect(r).toEqual({ paidLeaveDays: 0.5, otherLeaveDays: 0 })
  })

  it('複数日の paid_full は日数分加算', () => {
    const r = countLeaveDaysInMonth(
      [{ leaveType: 'paid_full', startDate: '2026-04-10', endDate: '2026-04-12' }],
      '2026-04',
    )
    expect(r).toEqual({ paidLeaveDays: 3, otherLeaveDays: 0 })
  })

  it('substitute / special / sick / other は otherLeaveDays', () => {
    const slices: ApprovedLeaveSlice[] = [
      { leaveType: 'substitute', startDate: '2026-04-01', endDate: '2026-04-01' },
      { leaveType: 'special', startDate: '2026-04-02', endDate: '2026-04-02' },
      { leaveType: 'sick', startDate: '2026-04-03', endDate: '2026-04-04' },
      { leaveType: 'other', startDate: '2026-04-05', endDate: '2026-04-05' },
    ]
    const r = countLeaveDaysInMonth(slices, '2026-04')
    expect(r).toEqual({ paidLeaveDays: 0, otherLeaveDays: 5 })
  })

  it('月をまたぐ場合は当月にクリップ', () => {
    // 3/30 〜 4/3 の 5 日間 → 当月 (4 月) は 4/1 〜 4/3 の 3 日のみ
    const r = countLeaveDaysInMonth(
      [{ leaveType: 'paid_full', startDate: '2026-03-30', endDate: '2026-04-03' }],
      '2026-04',
    )
    expect(r.paidLeaveDays).toBe(3)
  })

  it('月の終わりまたぎも clip', () => {
    // 4/29 〜 5/2 → 当月は 4/29, 30 の 2 日
    const r = countLeaveDaysInMonth(
      [{ leaveType: 'paid_full', startDate: '2026-04-29', endDate: '2026-05-02' }],
      '2026-04',
    )
    expect(r.paidLeaveDays).toBe(2)
  })

  it('当月外は 0 として無視', () => {
    const r = countLeaveDaysInMonth(
      [{ leaveType: 'paid_full', startDate: '2026-05-10', endDate: '2026-05-12' }],
      '2026-04',
    )
    expect(r).toEqual({ paidLeaveDays: 0, otherLeaveDays: 0 })
  })

  it('複数の休暇を合算', () => {
    const r = countLeaveDaysInMonth(
      [
        { leaveType: 'paid_full', startDate: '2026-04-10', endDate: '2026-04-10' },
        { leaveType: 'paid_half_am', startDate: '2026-04-11', endDate: '2026-04-11' },
        { leaveType: 'sick', startDate: '2026-04-15', endDate: '2026-04-16' },
      ],
      '2026-04',
    )
    expect(r).toEqual({ paidLeaveDays: 1.5, otherLeaveDays: 2 })
  })

  it('月末 31 日まで対応 (1 月)', () => {
    const r = countLeaveDaysInMonth(
      [{ leaveType: 'paid_full', startDate: '2026-01-29', endDate: '2026-01-31' }],
      '2026-01',
    )
    expect(r.paidLeaveDays).toBe(3)
  })

  it('月末 28/29 日 (2 月) も対応', () => {
    // 2026 年 2 月は 28 日
    const r = countLeaveDaysInMonth(
      [{ leaveType: 'paid_full', startDate: '2026-02-26', endDate: '2026-02-28' }],
      '2026-02',
    )
    expect(r.paidLeaveDays).toBe(3)
    // 範囲を 3/2 まで延ばしても 28 日でクリップ
    const r2 = countLeaveDaysInMonth(
      [{ leaveType: 'paid_full', startDate: '2026-02-27', endDate: '2026-03-02' }],
      '2026-02',
    )
    expect(r2.paidLeaveDays).toBe(2)
  })
})

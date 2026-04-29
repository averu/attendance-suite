import { describe, it, expect } from 'vitest'
import { computeMonthlyBreakdown } from './monthlyBreakdown'
import type { TimeRange } from './types'

const D = (s: string) => new Date(s)
const seg = (start: string, end: string): TimeRange => ({
  start: D(start),
  end: D(end),
})

describe('computeMonthlyBreakdown', () => {
  it('空配列 → 全 0', () => {
    const r = computeMonthlyBreakdown([])
    expect(r.totalLegalOvertimeMinutes).toBe(0)
    expect(r.legalOvertimeOver60Minutes).toBe(0)
    expect(r.totalLateNightMinutes).toBe(0)
    expect(r.legalHolidayWorkedMinutes).toBe(0)
    expect(r.perDay).toEqual([])
  })

  it('日次 OT を時系列で carryIn に渡し、月内 60h 超を分離する', () => {
    // 各日 10h 労働を 7 日続ける = 7 日 × 2h OT = 14h 累計
    // 60h まで届くには 30 日かかる: 30 日 × 2h = 60h ぴったり、31 日目から over60
    const days = []
    for (let day = 1; day <= 31; day++) {
      const dd = String(day).padStart(2, '0')
      days.push({
        workDate: `2026-04-${dd}`,
        // 09:00-19:00 JST = 00:00-10:00 UTC = 10h 労働
        workSegments: [seg(`2026-04-${dd}T00:00:00Z`, `2026-04-${dd}T10:00:00Z`)],
        isLegalHoliday: false,
      })
    }
    const r = computeMonthlyBreakdown(days)
    // 31 × 2h = 62h の OT。うち 60h までが under60、2h が over60
    expect(r.totalLegalOvertimeMinutes).toBe(62 * 60)
    expect(r.legalOvertimeOver60Minutes).toBe(2 * 60)
    expect(
      r.totals.legalOvertimeUnder60DaytimeMinutes +
        r.totals.legalOvertimeUnder60NightMinutes,
    ).toBe(60 * 60)
  })

  it('日付がランダム順でも昇順にソートして処理される', () => {
    const days = [
      // 後の日の方が先に並んでいるが結果は同じ
      {
        workDate: '2026-04-03',
        workSegments: [seg('2026-04-03T00:00:00Z', '2026-04-03T10:00:00Z')],
        isLegalHoliday: false,
      },
      {
        workDate: '2026-04-01',
        workSegments: [seg('2026-04-01T00:00:00Z', '2026-04-01T10:00:00Z')],
        isLegalHoliday: false,
      },
      {
        workDate: '2026-04-02',
        workSegments: [seg('2026-04-02T00:00:00Z', '2026-04-02T10:00:00Z')],
        isLegalHoliday: false,
      },
    ]
    const r = computeMonthlyBreakdown(days)
    expect(r.perDay.map((d) => d.workDate)).toEqual([
      '2026-04-01',
      '2026-04-02',
      '2026-04-03',
    ])
    // 3 日 × 2h = 6h 全部 under60
    expect(r.totalLegalOvertimeMinutes).toBe(6 * 60)
    expect(r.legalOvertimeOver60Minutes).toBe(0)
  })

  it('法定休日労働は legalHolidayWorked に集計、legalOT には積まれない', () => {
    const days = [
      {
        workDate: '2026-04-26', // Sunday
        workSegments: [seg('2026-04-26T00:00:00Z', '2026-04-26T08:00:00Z')], // 9-17 JST
        isLegalHoliday: true,
      },
    ]
    const r = computeMonthlyBreakdown(days)
    expect(r.legalHolidayWorkedMinutes).toBe(480)
    expect(r.totalLegalOvertimeMinutes).toBe(0)
  })

  it('深夜帯総分は night 系 4 バケットの合計', () => {
    // 1 日 10h 労働 (うち 22-23 JST 1h 深夜): legalOvertimeUnder60Night 60
    const days = [
      {
        workDate: '2026-04-29',
        // 14-24 JST = 05-15 UTC = 10h
        workSegments: [seg('2026-04-29T05:00:00Z', '2026-04-29T15:00:00Z')],
        isLegalHoliday: false,
      },
    ]
    const r = computeMonthlyBreakdown(days)
    // 14-22 JST 8h withinLegalDaytime, 22-24 JST 2h legalOvertimeUnder60Night
    expect(r.totals.withinLegalDaytimeMinutes).toBe(480)
    expect(r.totals.legalOvertimeUnder60NightMinutes).toBe(120)
    expect(r.totalLateNightMinutes).toBe(120)
  })
})
